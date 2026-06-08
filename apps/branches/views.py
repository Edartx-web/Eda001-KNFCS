"""apps/branches/views.py"""
from rest_framework             import status
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.cache          import cache

from apps.branches.models      import Branch, BranchTable
from apps.branches.serializers import BranchSerializer, BranchCreateSerializer, BranchTableSerializer
from apps.accounts.permissions import IsSuperAdminOnly, IsAdminOrAbove


def ok(data=None, message="", code=status.HTTP_200_OK):
    body = {"success": True}
    if message:
        body["message"] = message
    if data:
        body.update(data)
    return Response(body, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": message}, status=code)


class BranchListCreateView(APIView):
    """
    GET  /api/v1/branches/  → SuperAdmin: all branches; BranchAdmin: own branch.
    POST /api/v1/branches/  → SuperAdmin only: create new branch.
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        if request.user.role == Role.SUPER_ADMIN:
            branches = Branch.objects.all().order_by("name")
        else:
            branches = Branch.objects.filter(id=request.user.branch_id)
        data = BranchSerializer(branches, many=True).data
        return ok({"branches": data, "count": len(data)})

    def post(self, request):
        if not IsSuperAdminOnly().has_permission(request, self):
            return err("Only Super Admin can create branches.", 403)

        s = BranchCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        branch = s.save()

        # Auto-generate QR code linking to the menu with this branch selected
        try:
            _generate_qr_for_branch(branch, request)
        except Exception:
            pass  # QR failure should not block branch creation

        return ok(
            {"branch": BranchSerializer(branch).data},
            "Branch created successfully.",
            code=status.HTTP_201_CREATED,
        )


class BranchDetailView(APIView):
    """
    GET   /api/v1/branches/<id>/  → view branch.
    PATCH /api/v1/branches/<id>/  → update branch (BranchAdmin or SuperAdmin).
    DELETE /api/v1/branches/<id>/ → soft-delete branch (SuperAdmin only).
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def _get(self, pk, request):
        from apps.accounts.models import Role
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return None
        if request.user.role == Role.BRANCH_ADMIN:
            if str(request.user.branch_id) != str(branch.id):
                return None
        return branch

    def get(self, request, pk):
        branch = self._get(pk, request)
        if not branch:
            return err("Branch not found.", 404)
        return ok({"branch": BranchSerializer(branch).data})

    def patch(self, request, pk):
        branch = self._get(pk, request)
        if not branch:
            return err("Branch not found.", 404)
        s = BranchSerializer(branch, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok({"branch": s.data}, "Branch updated.")

    def delete(self, request, pk):
        from apps.accounts.models import Role
        if request.user.role != Role.SUPER_ADMIN:
            return err("Only SuperAdmin can delete branches.", 403)
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return err("Branch not found.", 404)
        name = branch.name
        branch.is_active = False
        branch.save(update_fields=["is_active"])
        return ok({"message": f"Branch '{name}' has been deactivated."}, code=200)


class PublicBranchListView(APIView):
    """
    GET /api/v1/branches/public/
    Returns all active branches for unauthenticated customers.
    Only exposes safe public fields — no staff/admin data.
    Used by the frontend branch-selector popup before login/ordering.
    """
    permission_classes  = []   # AllowAny — public endpoint
    throttle_classes    = []   # No rate-limiting — this endpoint must always respond

    def get(self, request):
        from rest_framework.permissions import AllowAny
        qs = Branch.objects.filter(is_active=True).order_by("name").values(
            "id", "name", "address", "phone", "email",
            "latitude", "longitude",
            "operating_hours", "is_active",
            "upi_id", "gpay_upi_id", "phonepe_upi_id", "supermoney_upi_id",
            "enable_pickup", "enable_dine_in", "pickup_upi_only",
        )
        branches = list(qs)
        return Response({
            "success":  True,
            "branches": branches,
            "count":    len(branches),
        })


class BranchOperatingHoursView(APIView):
    """
    GET   /api/v1/branches/<id>/hours/  → get operating hours + current open status
    PATCH /api/v1/branches/<id>/hours/  → update operating hours or override open/closed

    operating_hours JSON shape:
    {
      "manual_override": null | "open" | "closed",
      "override_until": "2024-01-01T23:59:00" | null,
      "schedule": {
        "mon": {"open": "09:00", "close": "22:00", "closed": false},
        "tue": {"open": "09:00", "close": "22:00", "closed": false},
        ... sun ...
      }
    }
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get_permissions(self):
        """GET is public — customers check open status. PATCH requires admin."""
        from rest_framework.permissions import AllowAny
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrAbove()]

    def _get(self, pk, request):
        from apps.accounts.models import Role
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return None
        if request.user.role == Role.BRANCH_ADMIN:
            if str(request.user.branch_id) != str(branch.id):
                return None
        return branch

    def _parse_until(self, override_until):
        """Parse override_until string robustly, handles both 'Z' and '+05:30' suffixes."""
        from datetime import datetime
        from django.utils import timezone
        s = override_until.strip()
        # Python < 3.11 doesn't handle 'Z' in fromisoformat — replace it
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        until = datetime.fromisoformat(s)
        if timezone.is_naive(until):
            until = timezone.make_aware(until)
        return until

    def _is_open_now(self, hours):
        """Compute current open status from operating_hours dict.

        Always uses Django's timezone.localtime() so the comparison is made in
        IST (Asia/Kolkata) regardless of the server OS clock (which may be UTC).
        """
        from datetime import time as dt_time
        from django.utils import timezone

        if not hours:
            return True  # No config = always open

        # Use IST "now" throughout — timezone.localtime() converts the
        # UTC-aware datetime to the TIME_ZONE configured in settings.
        now_ist = timezone.localtime(timezone.now())

        # Manual override takes priority
        override = hours.get("manual_override")
        override_until = hours.get("override_until")
        if override in ("open", "closed"):
            if override_until:
                try:
                    until = self._parse_until(override_until)
                    if now_ist < until:
                        return override == "open"
                    # override_until has passed — fall through to schedule
                except Exception:
                    return override == "open"  # can't parse → treat as permanent override
            else:
                return override == "open"

        # Check schedule using IST weekday and time
        schedule = hours.get("schedule", {})
        day_map = {0:"mon",1:"tue",2:"wed",3:"thu",4:"fri",5:"sat",6:"sun"}
        today_key = day_map.get(now_ist.weekday(), "mon")
        day_cfg = schedule.get(today_key, {})

        if day_cfg.get("closed"):
            return False

        open_str  = day_cfg.get("open",  "00:00")
        close_str = day_cfg.get("close", "23:59")
        try:
            oh, om = map(int, open_str.split(":"))
            ch, cm = map(int, close_str.split(":"))
            open_t  = dt_time(oh, om)
            close_t = dt_time(ch, cm)
            current = now_ist.time().replace(second=0, microsecond=0)
            return open_t <= current <= close_t
        except Exception:
            return True

    def _next_open_at(self, hours):
        """Return ISO string of next scheduled open time, or None."""
        from datetime import time as dt_time, datetime, timedelta
        from django.utils import timezone

        if not hours:
            return None

        now_ist  = timezone.localtime(timezone.now())
        schedule = hours.get("schedule", {})

        # If manual_override=closed with a finite override_until, return that expiry
        override       = hours.get("manual_override")
        override_until = hours.get("override_until")
        if override == "closed" and override_until:
            try:
                until = self._parse_until(override_until)
                if until > now_ist:
                    return until.isoformat()
            except Exception:
                pass

        if not schedule:
            return None

        day_map = {0:"mon", 1:"tue", 2:"wed", 3:"thu", 4:"fri", 5:"sat", 6:"sun"}
        for offset in range(8):
            check_date = now_ist.date() + timedelta(days=offset)
            day_cfg    = schedule.get(day_map.get(check_date.weekday()), {})
            if day_cfg.get("closed"):
                continue
            open_str = day_cfg.get("open", "00:00")
            try:
                oh, om = map(int, open_str.split(":"))
                open_t = dt_time(oh, om)
            except Exception:
                continue
            if offset == 0:
                current = now_ist.time().replace(second=0, microsecond=0)
                if open_t <= current:
                    continue
            naive_dt = datetime.combine(check_date, open_t)
            return timezone.make_aware(naive_dt).isoformat()
        return None

    def get(self, request, pk):
        # Customers can read hours (to show open/closed status on cart)
        # Admins can also read. No auth required for GET.
        cache_key = f"branches:hours:{pk}"
        cached = cache.get(cache_key)
        if cached is not None:
            resp = ok(cached)
            resp["Cache-Control"] = "public, max-age=60, stale-while-revalidate=10"
            return resp

        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return err("Branch not found.", 404)
        hours   = branch.operating_hours or {}
        is_open = self._is_open_now(hours)
        payload = {
            "operating_hours":   hours,
            "is_open_now":       is_open,
            "next_open_at":      None if is_open else self._next_open_at(hours),
            "enable_dine_in":    branch.enable_dine_in,
            "enable_pickup":     branch.enable_pickup,
            "pickup_upi_only":   branch.pickup_upi_only,
            "upi_id":            branch.upi_id or "",
        }
        if branch.upi_id:
            payload["payment_qr_url"] = f"/api/v1/branches/{branch.id}/payment-qr/"
        cache.set(cache_key, payload, 60)
        resp = ok(payload)
        resp["Cache-Control"] = "public, max-age=60, stale-while-revalidate=10"
        return resp

    def patch(self, request, pk):
        branch = self._get(pk, request)
        if not branch:
            return err("Branch not found.", 404)

        hours = branch.operating_hours or {}

        # Merge updates
        if "manual_override" in request.data:
            hours["manual_override"] = request.data["manual_override"]  # null | "open" | "closed"
        if "override_until" in request.data:
            hours["override_until"] = request.data["override_until"]
        if "schedule" in request.data:
            hours["schedule"] = request.data["schedule"]

        branch.operating_hours = hours
        branch.save(update_fields=["operating_hours"])
        cache.delete(f"branches:hours:{pk}")

        return ok({
            "operating_hours": hours,
            "is_open_now": self._is_open_now(hours),
            "message": "Operating hours updated.",
        })


# ─────────────────────────────────────────────────────────────────────────────
# QR CODE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_qr_for_branch(branch, request=None):
    """
    Generate a QR code for this branch that links directly to the menu.
    URL encodes the branch_id so the customer is auto-placed on scan.
    Saves to branch.qr_code ImageField and returns the absolute URL.
    """
    import qrcode
    import io
    from django.core.files.base import ContentFile
    from django.conf import settings

    # The URL the QR will encode — frontend menu with branch pre-selected
    base = (
        request.build_absolute_uri("/").rstrip("/")
        if request else "http://localhost:3000"
    )
    # Remove the /api/v1 path if present
    if "/api" in base:
        base = base.split("/api")[0]
    qr_url = f"{base}/menu?branch_id={branch.id}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#E8521A", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    filename = f"branch_{branch.id}.png"
    branch.qr_code.save(filename, ContentFile(buf.read()), save=True)

    if request:
        return request.build_absolute_uri(branch.qr_code.url)
    return branch.qr_code.url


class BranchQRCodeView(APIView):
    """
    GET  /api/v1/branches/<pk>/qr/  → return existing QR or generate new one
    POST /api/v1/branches/<pk>/qr/  → regenerate QR code (useful after URL change)
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return err("Branch not found.", 404)

        if branch.qr_code:
            return ok({
                "qr_url":    request.build_absolute_uri(branch.qr_code.url),
                "branch_id": str(branch.id),
                "branch_name": branch.name,
            })

        # Generate if missing
        qr_url = _generate_qr_for_branch(branch, request)
        return ok({
            "qr_url":    qr_url,
            "branch_id": str(branch.id),
            "branch_name": branch.name,
            "generated":  True,
        })

    def post(self, request, pk):
        """Force-regenerate the QR code."""
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return err("Branch not found.", 404)

        qr_url = _generate_qr_for_branch(branch, request)
        return ok({
            "qr_url":    qr_url,
            "branch_id": str(branch.id),
            "branch_name": branch.name,
            "regenerated": True,
        })


# ── Payment QR helpers ─────────────────────────────────────────────────────────

import hashlib as _hashlib
import hmac    as _hmac
import time    as _time


def _qr_sign(branch_id: str, amount: str, ts: str) -> str:
    """
    HMAC-SHA256 signature over "branch_id:amount:ts" using the Django
    SECRET_KEY.  Truncated to 32 hex chars for a compact URL parameter.
    """
    from django.conf import settings
    msg = f"{branch_id}:{amount}:{ts}".encode()
    return _hmac.new(settings.SECRET_KEY.encode(), msg, _hashlib.sha256).hexdigest()[:32]


def _qr_verify(branch_id: str, amount: str, ts: str, sig: str) -> bool:
    """Return True when *sig* is valid and the token is not older than 30 min."""
    try:
        issued = int(ts)
    except (TypeError, ValueError):
        return False
    if abs(_time.time() - issued) > 1800:   # 30-minute window
        return False
    expected = _qr_sign(branch_id, amount, ts)
    return _hmac.compare_digest(expected, sig)


# ── Payment QR ─────────────────────────────────────────────────────────────────

class BranchPaymentQRView(APIView):
    """
    GET /api/v1/branches/<pk>/payment-qr/
    Returns a PNG QR encoding the UPI payment deep-link.

    Security:
    - Requires authenticated customer (JWT Bearer token).
    - Requires HMAC-signed query parameters (ts + sig) issued by payment-info.
    - Rate-limited to 10 requests/minute per user.
    - Response carries Cache-Control: no-store, Pragma: no-cache.
    """
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.throttling  import UserRateThrottle

    class _QRThrottle(UserRateThrottle):
        rate = "10/min"
        scope = "payment_qr"

    permission_classes = [IsAuthenticated]
    throttle_classes   = [_QRThrottle]

    def get(self, request, pk):
        import io
        import qrcode
        from django.http import HttpResponse
        from urllib.parse import quote

        # ── HMAC verification ──────────────────────────────────────────────
        amount = request.GET.get("am", "")
        ts     = request.GET.get("ts", "")
        sig    = request.GET.get("sig", "")

        if not _qr_verify(str(pk), amount, ts, sig):
            return HttpResponse(status=403, content=b"Invalid or expired QR token.")

        try:
            branch = Branch.objects.get(pk=pk, is_active=True)
        except Branch.DoesNotExist:
            return HttpResponse(status=404)

        if not branch.upi_id:
            return HttpResponse(status=404)

        note    = request.GET.get("tn", "KNFC Order Payment")
        upi_str = f"upi://pay?pa={quote(branch.upi_id)}&pn={quote(branch.name)}&cu=INR"
        if amount:
            try:
                # Validate amount is a positive number
                float(amount)
                upi_str += f"&am={amount}"
            except ValueError:
                pass
        upi_str += f"&tn={quote(note)}"

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(upi_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        resp = HttpResponse(buf.read(), content_type="image/png")
        resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp["Pragma"]        = "no-cache"
        resp["X-Content-Type-Options"] = "nosniff"
        return resp


class BranchPaymentInfoView(APIView):
    """
    GET /api/v1/branches/<pk>/payment-info/?am=<total>
    Returns UPI details + a signed QR URL for the given amount.

    Security:
    - Requires authenticated customer (JWT Bearer token).
    - UPI IDs are decrypted only on demand — never stored in logs or caches.
    - The returned payment_qr_url contains an HMAC signature valid for 30 min.
    """
    from rest_framework.permissions import IsAuthenticated
    permission_classes = [IsAuthenticated]
    throttle_classes   = []

    def get(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk, is_active=True)
        except Branch.DoesNotExist:
            return Response({"success": False, "error": "Branch not found."}, status=404)

        qr_url = None
        if branch.upi_id:
            amount = request.GET.get("am", "")
            ts     = str(int(_time.time()))
            sig    = _qr_sign(str(pk), amount, ts)
            base   = request.build_absolute_uri(f"/api/v1/branches/{pk}/payment-qr/")
            qr_url = f"{base}?am={amount}&ts={ts}&sig={sig}"
            if request.GET.get("tn"):
                from urllib.parse import quote as _q
                qr_url += f"&tn={_q(request.GET['tn'])}"

        return Response({
            "success":          True,
            "branch_id":        str(branch.id),
            "branch_name":      branch.name,
            "upi_id":           branch.upi_id,
            "gpay_upi_id":      branch.gpay_upi_id,
            "phonepe_upi_id":   branch.phonepe_upi_id,
            "supermoney_upi_id":branch.supermoney_upi_id,
            "payment_qr_url":   qr_url,
            "pickup_upi_only":  branch.pickup_upi_only,
        })


# ── SiteConfig ─────────────────────────────────────────────────────────────────

class SiteConfigView(APIView):
    """
    GET  /api/v1/branches/config/   — public read (any user, including anon)
    PATCH /api/v1/branches/config/  — SuperAdmin only update
    """
    throttle_classes = []

    def get_permissions(self):
        if self.request.method == "PATCH":
            from apps.accounts.permissions import IsSuperAdminOnly
            return [IsSuperAdminOnly()]
        return []

    def get(self, request):
        from apps.branches.site_config import SiteConfig
        cfg = SiteConfig.get()
        login_image_url = None
        if cfg.login_image:
            try:
                u = cfg.login_image.url
                login_image_url = u if u.startswith("http") else request.build_absolute_uri(u)
            except Exception:
                login_image_url = None
        about_image_url = None
        if cfg.about_image:
            try:
                u = cfg.about_image.url
                about_image_url = u if u.startswith("http") else request.build_absolute_uri(u)
            except Exception:
                about_image_url = None

        return Response({"success": True, "config": {
            "loyalty_enabled":        cfg.loyalty_enabled,
            "loyalty_earn_rate":      float(cfg.loyalty_earn_rate),
            "loyalty_redeem_rate":    float(cfg.loyalty_redeem_rate),
            "loyalty_min_redeem":     cfg.loyalty_min_redeem,
            "loyalty_redeem_step":    cfg.loyalty_redeem_step,
            "loyalty_max_redeem_pct": cfg.loyalty_max_redeem_pct,
            "spin_enabled":           cfg.spin_enabled,
            "spin_max_uses":          cfg.spin_max_uses,
            "spin_prizes":            cfg.spin_prizes,
            "scratch_enabled":        cfg.scratch_enabled,
            "scratch_discount_pct":   cfg.scratch_discount_pct,
            "scratch_max_uses":       cfg.scratch_max_uses,
            "scratch_coupon_code":    cfg.scratch_coupon_code,
            "login_image_url":        login_image_url,
            "login_video_url":        cfg.login_video_url or "",
            "login_slides":           cfg.login_slides or [],
            "home_ads":               cfg.home_ads or [],
            "home_section_images":    cfg.home_section_images or {},
            "site_url":               cfg.site_url or "",
            # Contact
            "contact_phone":          cfg.contact_phone or "",
            "contact_email":          cfg.contact_email or "",
            "contact_wa_number":      cfg.contact_wa_number or "",
            "contact_address":        cfg.contact_address or "",
            # About
            "about_headline":         cfg.about_headline or "About KNFC Fried Chicken",
            "about_tagline":          cfg.about_tagline or "",
            "about_content":          cfg.about_content or "",
            "about_image_url":        about_image_url,
            "about_video_url":        cfg.about_video_url or "",
            "about_stats":            cfg.about_stats or [],
            # Blog
            "blog_posts":             cfg.blog_posts or [],
            # Careers
            "careers_intro":          cfg.careers_intro or "",
            "careers_openings":       cfg.careers_openings or [],
            # Re-engagement
            "reengagement_default_days": cfg.reengagement_default_days,
            # Footer
            "footer_show_map":        cfg.footer_show_map,
            "footer_map_query":       cfg.footer_map_query or "KNFC+Fried+Chicken",
        }})

    def patch(self, request):
        from apps.branches.site_config import SiteConfig
        cfg    = SiteConfig.get()
        fields = [
            "loyalty_enabled", "loyalty_earn_rate", "loyalty_redeem_rate",
            "loyalty_min_redeem", "loyalty_redeem_step", "loyalty_max_redeem_pct",
            "spin_enabled", "spin_max_uses", "spin_prizes",
            "scratch_enabled", "scratch_discount_pct", "scratch_max_uses", "scratch_coupon_code",
            "login_video_url", "login_slides", "home_ads", "site_url",
            "home_section_images",
            "contact_phone", "contact_email", "contact_wa_number", "contact_address",
            "about_headline", "about_tagline", "about_content", "about_video_url", "about_stats",
            "blog_posts", "careers_intro", "careers_openings",
            "reengagement_default_days", "footer_show_map", "footer_map_query",
        ]
        for f in fields:
            if f in request.data:
                setattr(cfg, f, request.data[f])
        if "login_image" in request.FILES:
            cfg.login_image = request.FILES["login_image"]
        elif request.data.get("login_image_clear") == "true" and cfg.login_image:
            cfg.login_image.delete(save=False)
            cfg.login_image = None
        if "about_image" in request.FILES:
            cfg.about_image = request.FILES["about_image"]
        elif request.data.get("about_image_clear") == "true" and cfg.about_image:
            cfg.about_image.delete(save=False)
            cfg.about_image = None
        cfg.save()
        return Response({"success": True, "message": "Settings saved."})


# ── Spin Wheel ──────────────────────────────────────────────────────────────────

class SpinView(APIView):
    """
    GET  /api/v1/branches/spin/  — returns config + today's spins used by this customer
    POST /api/v1/branches/spin/  — record a spin result, returns coupon/discount if applicable
    """
    throttle_classes = []

    def get_permissions(self):
        return []  # public read; POST validates auth inline

    def get(self, request):
        from apps.branches.site_config import SiteConfig
        cfg = SiteConfig.get()
        spins_used = 0
        if request.user.is_authenticated:
            from django.utils.timezone import now
            from apps.branches.spin_log import SpinLog
            spins_used = SpinLog.objects.filter(
                customer=request.user,
                spun_at__date=now().date(),
            ).count()
        return Response({
            "spin_enabled": cfg.spin_enabled,
            "spin_max_uses": cfg.spin_max_uses,
            "spin_prizes": cfg.spin_prizes,
            "spins_used": spins_used,
            "spins_left": max(0, (cfg.spin_max_uses or 1) - spins_used),
        })

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Login required"}, status=401)

        from apps.branches.site_config import SiteConfig
        from apps.branches.spin_log import SpinLog
        from django.utils.timezone import now

        cfg = SiteConfig.get()
        if not cfg.spin_enabled:
            return Response({"error": "Spin wheel is currently disabled"}, status=403)

        today_count = SpinLog.objects.filter(
            customer=request.user,
            spun_at__date=now().date(),
        ).count()

        max_uses = cfg.spin_max_uses or 1
        if today_count >= max_uses:
            return Response({
                "error": f"You have used all {max_uses} spin(s) for today. Come back tomorrow!",
                "spins_left": 0,
            }, status=429)

        label       = (request.data.get("label") or "").strip()
        prize_pct   = int(request.data.get("prize_pct") or 0)
        prize_color = (request.data.get("prize_color") or "#E8521A").strip()

        SpinLog.objects.create(
            customer    = request.user,
            prize_label = label,
            prize_pct   = prize_pct,
            prize_color = prize_color,
        )

        return Response({
            "ok": True,
            "label":      label,
            "prize_pct":  prize_pct,
            "spins_left": max(0, max_uses - today_count - 1),
        })


class UploadMediaView(APIView):
    """
    POST /api/v1/branches/upload-media/
    Upload an image or video file; returns its absolute URL.
    Used for home-page ad banners and offer media.
    SuperAdmin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]

    def post(self, request):
        import os, uuid
        from django.conf import settings
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile

        f = request.FILES.get("file")
        if not f:
            return err("No file provided.")

        ext  = os.path.splitext(f.name)[-1].lower()
        name = f"uploads/{uuid.uuid4().hex}{ext}"
        path = default_storage.save(name, ContentFile(f.read()))
        media_relative = settings.MEDIA_URL + path  # e.g. /media/uploads/abc.jpg
        backend_url    = getattr(settings, "BACKEND_URL", "").rstrip("/")
        if backend_url:
            url = f"{backend_url}{media_relative}"
        else:
            url = request.build_absolute_uri(media_relative)
        return Response({"success": True, "url": url, "path": path})


class BranchTableListView(APIView):
    """
    GET  /api/v1/branches/<pk>/tables/  — list tables + live availability (public)
    POST /api/v1/branches/<pk>/tables/  — create table (BranchAdmin / SuperAdmin)
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAdminOrAbove()]

    def _occupied_numbers(self, branch_id):
        from apps.orders.models import Order
        from django.utils import timezone
        return set(
            Order.objects.filter(
                branch_id=branch_id,
                order_type="dine_in",
                status__in=["placed", "confirmed", "preparing", "ready"],
                created_at__date=timezone.localdate(),
            ).values_list("table_number", flat=True)
        )

    def get(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk, is_active=True)
        except Branch.DoesNotExist:
            return Response({"success": False, "error": "Branch not found."}, status=404)

        tables   = branch.tables.filter(is_active=True).order_by("table_number")
        occupied = self._occupied_numbers(pk)
        result   = []
        for t in tables:
            d = BranchTableSerializer(t).data
            d["is_available"] = t.table_number not in occupied
            result.append(d)

        return Response({"success": True, "tables": result})

    def post(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return Response({"success": False, "error": "Branch not found."}, status=404)

        user = request.user
        if user.role == "branch_admin" and str(user.branch_id) != str(pk):
            return Response({"success": False, "error": "Access denied."}, status=403)

        s = BranchTableSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        table = s.save(branch=branch)
        return Response({"success": True, "table": BranchTableSerializer(table).data}, status=201)


class BranchTableDetailView(APIView):
    """
    PATCH  /api/v1/branches/<pk>/tables/<tid>/  — update (BranchAdmin / SuperAdmin)
    DELETE /api/v1/branches/<pk>/tables/<tid>/  — delete (BranchAdmin / SuperAdmin)
    """
    permission_classes = [IsAdminOrAbove]

    def _get_table(self, pk, tid, user):
        try:
            table = BranchTable.objects.get(pk=tid, branch_id=pk)
        except BranchTable.DoesNotExist:
            return None
        if user.role == "branch_admin" and str(user.branch_id) != str(pk):
            return None
        return table

    def patch(self, request, pk, tid):
        table = self._get_table(pk, tid, request.user)
        if not table:
            return Response({"success": False, "error": "Table not found."}, status=404)
        s = BranchTableSerializer(table, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return Response({"success": True, "table": s.data})

    def delete(self, request, pk, tid):
        table = self._get_table(pk, tid, request.user)
        if not table:
            return Response({"success": False, "error": "Table not found."}, status=404)
        table.delete()
        return Response({"success": True, "message": "Table deleted."})
