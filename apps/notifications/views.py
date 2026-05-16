"""apps/notifications/views.py"""
import logging
import os
import requests as req_lib

from django.conf       import settings
from django.core.files.storage import default_storage
from django.core.mail  import send_mail
from django.utils      import timezone

from rest_framework             import status
from rest_framework.parsers     import MultiPartParser, FormParser, JSONParser
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework.permissions import AllowAny

from apps.accounts.permissions  import IsSuperAdminOnly, IsAdminOrAbove
from .models                    import BroadcastLog
from .serializers                import BroadcastLogSerializer

logger = logging.getLogger(__name__)


def _wa_url():
    return getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")


def _wa_headers():
    return {
        "Content-Type":   "application/json",
        "X-Internal-Key": getattr(settings, "WHATSAPP_INTERNAL_KEY", ""),
    }


def ok(**kwargs):
    return Response({"ok": True, **kwargs})


def err(msg, code=400):
    return Response({"error": msg}, status=code)


# ── Caption builder ───────────────────────────────────────────────────────────

def build_offer_caption(offer, intro="", site_url=""):
    """Auto-generate WhatsApp-formatted caption from a DailyOffer instance."""
    lines = []
    if intro:
        lines.append(intro)
        lines.append("")
    lines.append(f"{offer.emoji or '🔥'} *{offer.name}*")
    if offer.tagline:
        lines.append(offer.tagline)
    lines.append("")
    if offer.discount_percentage:
        lines.append(f"💰 *{offer.discount_percentage:.0f}% OFF*")
    elif offer.discount_flat:
        lines.append(f"💰 *₹{offer.discount_flat:.0f} OFF*")
    if offer.original_price and offer.offer_price:
        lines.append(f"~₹{offer.original_price:.0f}~ → *₹{offer.offer_price:.0f}*")
    elif offer.offer_price:
        lines.append(f"Only *₹{offer.offer_price:.0f}*")
    if offer.coupon_code:
        lines.append(f"Code: *{offer.coupon_code}*")
    lines.append("")
    if site_url:
        lines.append(f"View offer: {site_url.rstrip('/')}/offers/{offer.pk}")
        lines.append("")
    lines.append("Order now at KNFC 🍗")
    lines.append("_KNFC Fried Chicken_")
    return "\n".join(lines)


# ── WhatsApp status / logout ──────────────────────────────────────────────────

_SERVICE_DOWN = {
    "otp":       {"status": "service_down", "qr": None, "phone": None},
    "broadcast": {"status": "service_down", "qr": None, "phone": None},
}


class WhatsAppStatusView(APIView):
    """Returns live status of both Baileys sessions (proxied from Node service)."""
    permission_classes = [IsSuperAdminOnly]

    def get(self, request):
        try:
            r = req_lib.get(
                f"{_wa_url()}/status",
                headers=_wa_headers(),
                timeout=3,
            )
            return Response(r.json())
        except Exception as e:
            logger.warning(f"WhatsApp service unreachable: {e}")
            return Response(_SERVICE_DOWN)


class WhatsAppLogoutView(APIView):
    """Logout a session (clears credentials, triggers new QR)."""
    permission_classes = [IsSuperAdminOnly]

    def post(self, request):
        session = request.data.get("session")
        if session not in ("otp", "broadcast"):
            return err("session must be 'otp' or 'broadcast'")
        try:
            r = req_lib.post(
                f"{_wa_url()}/logout/{session}",
                headers=_wa_headers(),
                timeout=5,
            )
            return Response(r.json())
        except Exception as e:
            logger.error(f"WhatsApp logout failed: {e}")
            return err("Could not reach WhatsApp service", 503)


# ── Internal alert from Baileys on disconnect ─────────────────────────────────

class WhatsAppAlertView(APIView):
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        key = request.headers.get("X-Internal-Key", "")
        if key != getattr(settings, "WHATSAPP_INTERNAL_KEY", ""):
            return Response({"error": "Unauthorized"}, status=401)

        session = request.data.get("session", "unknown")
        event   = request.data.get("event", "disconnected")
        logger.warning(f"WhatsApp alert — session={session} event={event}")

        admin_email = settings.EMAIL_HOST_USER
        if admin_email:
            try:
                send_mail(
                    subject      = f"[KNFC] WhatsApp {session.upper()} session {event}",
                    message      = (
                        f"The WhatsApp '{session}' session has {event}.\n\n"
                        f"Please log in to the SuperAdmin panel and re-scan the QR code.\n\n"
                        f"WhatsApp Management: https://knfcs.com/superadmin/whatsapp"
                    ),
                    from_email   = settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin_email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"WhatsApp alert email failed: {e}")

        return ok()


# ── Broadcasts ────────────────────────────────────────────────────────────────

class BroadcastView(APIView):
    """
    GET  — list past broadcasts
    POST — create + trigger a new broadcast

    Accepts multipart/form-data so an image file can be uploaded directly.
    Fields:
      title         (required)
      intro_message (optional) — e.g. "Good morning! 🌟"
      message       (required unless offer_id given — auto-generated from offer)
      offer_id      (optional) — UUID of a DailyOffer; auto-generates caption
      image         (optional) — file upload (device photo)
      target        all | branch
      branch_id     required when target=branch
    """
    permission_classes = [IsAdminOrAbove]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = BroadcastLog.objects.select_related("created_by", "offer").all()
        if request.user.role == "branch_admin":
            qs = qs.filter(branch_id=request.user.branch_id)
        return Response(BroadcastLogSerializer(qs[:50], many=True).data)

    def post(self, request):
        data          = request.data
        title         = (data.get("title")         or "").strip()
        intro_message = (data.get("intro_message") or "").strip()
        message       = (data.get("message")       or "").strip()
        offer_id      = (data.get("offer_id")      or "").strip()
        image_file    = request.FILES.get("image")

        # Branch admins can only send offer broadcasts to their own branch
        if request.user.role == "branch_admin":
            if not offer_id:
                return err("Branch admins can only send offer broadcasts — please select an offer")
            target    = "branch"
            branch_id = str(request.user.branch_id)
        else:
            target    = data.get("target", "all")
            branch_id = data.get("branch_id") or None

        if not title:
            return err("title is required")
        if target not in ("all", "branch"):
            return err("target must be 'all' or 'branch'")
        if target == "branch" and not branch_id:
            return err("branch_id required when target is 'branch'")

        # ── Resolve offer ─────────────────────────────────────────────────────
        offer     = None
        image_url = (data.get("image_url") or "").strip()

        if offer_id:
            try:
                from apps.offers.models import DailyOffer
                from apps.branches.site_config import SiteConfig
                offer = DailyOffer.objects.get(pk=offer_id)
                # Auto-generate caption from offer (can be overridden by manual message)
                if not message:
                    site_url = SiteConfig.get().site_url or ""
                    message = build_offer_caption(offer, intro_message, site_url=site_url)
                # Use offer image if no custom image uploaded/provided
                if not image_url and not image_file and offer.image:
                    image_url = request.build_absolute_uri(offer.image.url)
            except Exception:
                return err("Offer not found", 404)
        elif not message:
            return err("message is required when no offer is selected")

        # ── Save uploaded image ───────────────────────────────────────────────
        if image_file:
            try:
                ext  = os.path.splitext(image_file.name)[1] or ".jpg"
                path = default_storage.save(f"broadcasts/{image_file.name}", image_file)
                image_url = request.build_absolute_uri(settings.MEDIA_URL + path)
            except Exception as e:
                logger.error(f"Broadcast image save failed: {e}")
                return err("Image upload failed", 500)

        # ── Create broadcast record ───────────────────────────────────────────
        broadcast = BroadcastLog.objects.create(
            title         = title,
            intro_message = intro_message,
            message       = message,
            image_url     = image_url,
            offer         = offer,
            target        = target,
            branch_id     = branch_id if target == "branch" else None,
            created_by    = request.user,
        )

        # ── Run broadcast in background thread (no Celery worker needed) ────────
        try:
            from apps.notifications.tasks import run_broadcast_in_thread
            run_broadcast_in_thread(str(broadcast.id))
            logger.info(f"Broadcast {broadcast.id} queued")
        except Exception as e:
            logger.error(f"Failed to start broadcast {broadcast.id}: {e}")
            broadcast.status = BroadcastLog.STATUS_FAILED
            broadcast.save(update_fields=["status"])
            return err(f"Broadcast created but failed to start: {e}", 500)

        return Response(BroadcastLogSerializer(broadcast).data, status=201)


class BroadcastDetailView(APIView):
    """Fetch live status of a single broadcast."""
    permission_classes = [IsAdminOrAbove]

    def get(self, request, pk):
        try:
            log = BroadcastLog.objects.select_related("created_by", "offer").get(pk=pk)
        except BroadcastLog.DoesNotExist:
            return err("Not found", 404)
        return Response(BroadcastLogSerializer(log).data)


class BroadcastRetryView(APIView):
    """
    POST /api/v1/notifications/broadcast/<pk>/retry/
    Re-queues a broadcast via Celery (pending/failed/running).

    POST /api/v1/notifications/broadcast/<pk>/retry/?force=1
    Force-runs in a thread, bypassing Celery entirely.
    Use when Celery worker is not running and tasks are stuck.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request, pk):
        force = request.query_params.get("force", "") in ("1", "true", "yes")
        try:
            broadcast = BroadcastLog.objects.get(pk=pk)
        except BroadcastLog.DoesNotExist:
            return err("Not found", 404)

        if broadcast.status == BroadcastLog.STATUS_DONE and not force:
            return err("Broadcast already completed. Pass ?force=1 to re-run from scratch.")

        BroadcastLog.objects.filter(pk=pk).update(
            status=BroadcastLog.STATUS_PENDING,
            sent_count=0,
            failed_count=0,
            total_recipients=0,
            completed_at=None,
        )

        try:
            from apps.notifications.tasks import run_broadcast, run_broadcast_in_thread
            if force:
                run_broadcast_in_thread(str(broadcast.id))
                logger.info(f"Broadcast {broadcast.id} force-run (thread) by {request.user}")
            else:
                run_broadcast.delay(str(broadcast.id))
                logger.info(f"Broadcast {broadcast.id} re-queued by {request.user}")
        except Exception as e:
            logger.error(f"Retry failed for broadcast {broadcast.id}: {e}")
            return err(f"Failed to run broadcast: {e}", 500)

        broadcast.refresh_from_db()
        return Response(BroadcastLogSerializer(broadcast).data)


class BroadcastForceRunAllView(APIView):
    """
    POST /api/v1/notifications/broadcast/force-run-all/
    Force-run ALL stuck broadcasts (pending / running / failed) via daemon threads.
    Bypasses Celery — use when Celery worker is down.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        from apps.notifications.tasks import run_broadcast_in_thread
        stuck = BroadcastLog.objects.filter(
            status__in=[
                BroadcastLog.STATUS_PENDING,
                BroadcastLog.STATUS_RUNNING,
                BroadcastLog.STATUS_FAILED,
            ]
        )
        ids = list(stuck.values_list("id", flat=True))
        if not ids:
            return ok(message="No stuck broadcasts found.", count=0)

        import threading as _t
        for bid in ids:
            _t.Thread(
                target=run_broadcast_in_thread,
                args=[str(bid)],
                daemon=True,
                name=f"force-all-{bid}",
            ).start()

        logger.info(f"Force-run-all triggered by {request.user}: {len(ids)} broadcasts")
        return ok(message=f"Force-running {len(ids)} stuck broadcast(s).", count=len(ids))
