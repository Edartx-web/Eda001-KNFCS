"""apps/offers/views.py"""
import json
import random
import string
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db.models import F, Q
from django.core.cache import cache

from .models import (
    DailyOffer, OfferType, OfferItem, OfferRedemption,
    ReferralLink, ReferralUsage, ReEngagementLog,
)
from .serializers import (
    DailyOfferSerializer, DailyOfferWriteSerializer,
    OfferRedemptionSerializer, ReferralLinkSerializer, ReferralUsageSerializer,
)
from apps.accounts.permissions import IsAdminOrAbove, IsCustomer, get_request_branch_id

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


def _generate_referral_code(length=8):
    """Generate a short unique uppercase alphanumeric code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.SystemRandom().choices(chars, k=length))
        if not ReferralLink.objects.filter(code=code).exists():
            return code


def _save_offer_extras(offer, request):
    """Persist offer_items (combo) and applies_to (specific items) from FormData JSON blobs."""
    raw_items = request.data.get("offer_items")
    if raw_items:
        try:
            items_data = json.loads(raw_items)
            offer.offer_items.all().delete()
            for d in items_data:
                OfferItem.objects.create(
                    offer=offer,
                    menu_item_id=d["menu_item_id"],
                    quantity=int(d.get("quantity", 1)),
                    notes=d.get("notes", ""),
                )
        except Exception as e:
            logger.error(f"offer_items parse error for offer {offer.id}: {e}")

    raw_applies = request.data.get("applies_to_ids")
    if raw_applies is not None:
        try:
            item_ids = json.loads(raw_applies) if raw_applies else []
            offer.applies_to.set(item_ids)
        except Exception as e:
            logger.error(f"applies_to parse error for offer {offer.id}: {e}")


def _maybe_auto_broadcast(offer, request):
    """Queue a broadcast if the offer has auto_broadcast=True and is now active."""
    if not offer.auto_broadcast or not offer.is_active:
        return
    try:
        from apps.notifications.models import BroadcastLog
        from apps.notifications.views import build_offer_caption
        from apps.notifications.tasks import run_broadcast_in_thread

        image_url = ""
        if offer.image:
            try:
                image_url = request.build_absolute_uri(offer.image.url)
            except Exception:
                pass

        broadcast = BroadcastLog.objects.create(
            title=f"{offer.name} — Auto Broadcast",
            message=build_offer_caption(offer),
            image_url=image_url,
            offer=offer,
            target=BroadcastLog.TARGET_ALL,
            branch_id=None,
            created_by=request.user,
        )
        run_broadcast_in_thread(str(broadcast.id))
        logger.info(f"Auto-broadcast queued for offer {offer.id} → broadcast {broadcast.id}")
    except Exception as e:
        logger.error(f"Auto-broadcast failed for offer {offer.id}: {e}")


# ── Public customer endpoints ─────────────────────────────────────────────────

class ActiveOffersView(APIView):
    """GET /api/v1/offers/ — active offers for a branch (excludes RE_ENGAGEMENT, internal types)."""
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        now = timezone.now()
        cache_key = f"offers:active:{branch_id}"
        cached_data = cache.get(cache_key)

        if cached_data is None:
            offers = DailyOffer.objects.filter(
                Q(branch_id=branch_id) | Q(all_branches=True),
                is_active=True,
                start_at__lte=now,
            ).filter(
                Q(end_at__isnull=True) | Q(end_at__gte=now)
            ).exclude(
                offer_type__in=[OfferType.RE_ENGAGEMENT, OfferType.SCRATCH_CARD]
            ).distinct().order_by("carousel_order", "-created_at")

            offers_list = list(offers)
            DailyOffer.objects.filter(
                id__in=[o.id for o in offers_list]
            ).update(view_count=F("view_count") + 1)

            cached_data = DailyOfferSerializer(offers_list, many=True, context={"request": request}).data
            cache.set(cache_key, cached_data, 60)

        # customer_has_ordered is user-specific — never cached
        customer_has_ordered = False
        if request.user.is_authenticated:
            from apps.orders.models import Order
            customer_has_ordered = Order.objects.filter(
                customer=request.user,
                status__in=["confirmed", "preparing", "ready", "completed"]
            ).exists()

        resp = ok({"offers": cached_data, "customer_has_ordered": customer_has_ordered})
        if not request.user.is_authenticated:
            resp["Cache-Control"] = "public, max-age=60, stale-while-revalidate=10"
        return resp


class OfferDetailView(APIView):
    """GET /api/v1/offers/<offer_id>/"""
    permission_classes = [AllowAny]

    def get(self, request, offer_id):
        try:
            offer = DailyOffer.objects.get(id=offer_id)
        except DailyOffer.DoesNotExist:
            return err("Offer not found.", status.HTTP_404_NOT_FOUND)

        DailyOffer.objects.filter(pk=offer.pk).update(view_count=F("view_count") + 1)
        return ok({"offer": DailyOfferSerializer(offer, context={"request": request}).data})


class CouponLookupView(APIView):
    """
    GET /api/v1/offers/coupon/?code=SAVE20&branch_id=<uuid>
    Validates a coupon code. Returns the offer details if valid.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code      = request.query_params.get("code", "").strip().upper()
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)

        if not code:
            return err("Coupon code is required.")
        if not branch_id:
            return err("branch_id is required.")

        try:
            offer = DailyOffer.objects.get(
                coupon_code__iexact=code,
                branch_id=branch_id,
                is_active=True,
            )
        except DailyOffer.DoesNotExist:
            # Also check referral reward coupons
            usage = ReferralUsage.objects.filter(
                reward_coupon__iexact=code,
                link__offer__branch_id=branch_id,
                status__in=[ReferralUsage.STATUS_REWARD_SENT],
            ).select_related("link__offer").first()
            if usage:
                return ok({
                    "offer": DailyOfferSerializer(usage.link.offer, context={"request": request}).data,
                    "is_referral_reward": True,
                })
            return err("Invalid or expired coupon code.", status.HTTP_404_NOT_FOUND)

        if not offer.is_valid_now:
            return err("This coupon has expired.")

        if offer.max_redemptions_per_user > 0 and request.user.is_authenticated:
            already = OfferRedemption.objects.filter(offer=offer, customer=request.user).count()
            if already >= offer.max_redemptions_per_user:
                return err("You have already used this offer the maximum number of times.")

        return ok({"offer": DailyOfferSerializer(offer, context={"request": request}).data})


# ── Referral endpoints ────────────────────────────────────────────────────────

class ReferralLinkView(APIView):
    """
    GET  /api/v1/offers/referral/link/?offer_id=<uuid>
         Returns (or creates) the customer's unique referral link for an offer.

    POST /api/v1/offers/referral/track/
         { code: "ABCD1234" } — Record a referral visit (called on landing).
         Public endpoint — no auth needed.
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        offer_id = request.query_params.get("offer_id")
        if not offer_id:
            return err("offer_id is required.")

        try:
            offer = DailyOffer.objects.get(id=offer_id, offer_type=OfferType.REFERRAL, is_active=True)
        except DailyOffer.DoesNotExist:
            return err("Referral offer not found.", 404)

        link, created = ReferralLink.objects.get_or_create(
            offer=offer,
            referrer=request.user,
            defaults={"code": _generate_referral_code()},
        )

        from django.conf import settings as dj_settings
        site_url = getattr(dj_settings, "SITE_URL", "https://knfcs.com")
        share_url = f"{site_url}/refer/{link.code}"

        return ok({
            "link": ReferralLinkSerializer(link, context={"request": request}).data,
            "share_url":     share_url,
            "whatsapp_share": f"https://wa.me/?text={_referral_wa_text(link, offer, share_url)}",
            "is_new": created,
        })


def _referral_wa_text(link, offer, share_url):
    """Build a pre-filled WhatsApp share message for the referral link."""
    from urllib.parse import quote
    reward = ""
    if offer.referral_reward_value:
        reward = f"₹{int(offer.referral_reward_value)} OFF"
    text = (
        f"🍗 Hey! I'm using KNFC Fried Chicken — best crispy chicken around!\n\n"
        f"Sign up with my link and get {reward or 'a special reward'} on your first order.\n\n"
        f"👉 {share_url}"
    )
    return quote(text)


class ReferralTrackView(APIView):
    """
    POST /api/v1/offers/referral/track/
    { code: "ABCD1234" }
    Called when a new user visits the referral link (before signup).
    Stores the referral code in the session for attribution after signup.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return err("Referral code is required.")

        try:
            link = ReferralLink.objects.select_related("offer", "referrer").get(code=code)
        except ReferralLink.DoesNotExist:
            return err("Invalid referral code.", 404)

        if not link.offer.is_valid_now:
            return err("This referral offer has expired.")

        # Increment visit count
        ReferralLink.objects.filter(pk=link.pk).update(used_count=F("used_count") + 1)

        return ok({
            "referrer_name": link.referrer.name,
            "offer_name":    link.offer.name,
            "reward_preview": _reward_preview(link.offer),
            "code":          code,
        })


def _reward_preview(offer):
    if offer.referral_reward_value:
        return f"₹{int(offer.referral_reward_value)} off for you + your friend"
    return "Special reward for you and your friend"


class ReferralClaimView(APIView):
    """
    POST /api/v1/offers/referral/claim/
    { code: "ABCD1234" }
    Called after a new user registers (CustomerRegisterView triggers this).
    Creates ReferralUsage record; grants reward if referral_reward_on_signup=True.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return err("Referral code is required.")

        try:
            link = ReferralLink.objects.select_related("offer", "referrer").get(code=code)
        except ReferralLink.DoesNotExist:
            return err("Invalid referral code.", 404)

        if link.referrer == request.user:
            return err("You cannot use your own referral link.")

        # Prevent duplicate usage
        usage_exists = ReferralUsage.objects.filter(link=link, referred_user=request.user).exists()
        if usage_exists:
            return err("You have already used this referral link.")

        usage = ReferralUsage.objects.create(
            link=link,
            referred_user=request.user,
            status=ReferralUsage.STATUS_SIGNED_UP,
        )

        # Grant immediate reward if configured
        if link.offer.referral_reward_on_signup:
            _grant_referral_reward(link, usage, request)

        return ok({"message": "Referral recorded. Reward will be sent once your friend's order qualifies."})


def _grant_referral_reward(link, usage, request=None):
    """Generate a one-time coupon for the referrer and send via WhatsApp."""
    reward_code = f"REF{_generate_referral_code(6)}"
    usage.status       = ReferralUsage.STATUS_REWARD_SENT
    usage.reward_coupon = reward_code
    usage.rewarded_at   = timezone.now()
    usage.save(update_fields=["status", "reward_coupon", "rewarded_at"])
    ReferralLink.objects.filter(pk=link.pk).update(reward_sent_count=F("reward_sent_count") + 1)

    # Send WhatsApp message to referrer
    referrer = link.referrer
    if referrer.phone:
        offer = link.offer
        reward_val = f"₹{int(offer.referral_reward_value)}" if offer.referral_reward_value else "a reward"
        msg = (
            f"🎉 *KNFC Fried Chicken — Referral Reward!*\n\n"
            f"Hello {referrer.name},\n"
            f"Your friend just joined KNFC using your referral link!\n\n"
            f"🎁 Your reward: *{reward_val} OFF* your next order\n"
            f"🔖 Use coupon code: *{reward_code}*\n\n"
            f"Order now at knfcs.com and enjoy your reward! 🍗"
        )
        try:
            from utils.otp import _send_wa
            _send_wa(referrer.phone, msg)
        except Exception:
            pass


class ReferralStatsView(APIView):
    """GET /api/v1/offers/referral/stats/ — customer sees their referral stats."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        links = ReferralLink.objects.filter(referrer=request.user).select_related("offer")
        result = []
        for link in links:
            usages = ReferralUsage.objects.filter(link=link)
            result.append({
                "offer_id":         str(link.offer_id),
                "offer_name":       link.offer.name,
                "code":             link.code,
                "visits":           link.used_count,
                "signups":          usages.count(),
                "rewards_earned":   link.reward_sent_count,
                "share_url":        f"{_site_url()}/refer/{link.code}",
            })
        return ok({"referrals": result})


def _site_url():
    from django.conf import settings as dj_settings
    return getattr(dj_settings, "SITE_URL", "https://knfcs.com")


# ── Welcome offer for new users ───────────────────────────────────────────────

class WelcomeOfferView(APIView):
    """
    GET /api/v1/offers/welcome/
    Returns active WELCOME offers for a branch, used to show a bonus banner after signup.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        now = timezone.now()
        offers = DailyOffer.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True),
            offer_type=OfferType.WELCOME,
            is_active=True,
            start_at__lte=now,
        ).filter(Q(end_at__isnull=True) | Q(end_at__gte=now)).first()

        if not offers:
            return ok({"offer": None})
        return ok({"offer": DailyOfferSerializer(offers, context={"request": request}).data})


# ── Admin endpoints ───────────────────────────────────────────────────────────

class AdminOfferCreateView(APIView):
    """GET/POST /api/v1/offers/admin/ — list or create offers."""
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        now = timezone.now()
        qs = DailyOffer.objects.filter(
            Q(end_at__isnull=True) | Q(end_at__gte=now)
        )
        if request.user.role != Role.SUPER_ADMIN:
            qs = qs.filter(branch_id=request.user.branch_id)
        qs = qs.order_by("carousel_order", "-created_at")
        return ok({"offers": DailyOfferSerializer(qs, many=True, context={"request": request}).data})

    def post(self, request):
        from apps.accounts.models import Role
        all_branches = request.data.get("all_branches", False)
        branch_id    = get_request_branch_id(request) or request.data.get("branch_id")

        if not branch_id and not all_branches:
            return err("branch_id is required.")

        branch = None
        if branch_id:
            from apps.branches.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                return err("Branch not found.")
        elif all_branches and request.user.role == Role.SUPER_ADMIN:
            from apps.branches.models import Branch
            branch = Branch.objects.filter(is_active=True).first()
            if not branch:
                return err("No active branch found.")

        serializer = DailyOfferWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)

        offer = serializer.save(branch=branch)
        _save_offer_extras(offer, request)
        _maybe_auto_broadcast(offer, request)
        return ok(
            {"offer": DailyOfferSerializer(offer, context={"request": request}).data},
            code=status.HTTP_201_CREATED,
        )


class AdminOfferUpdateView(APIView):
    """PATCH/DELETE /api/v1/offers/admin/<offer_id>/"""
    permission_classes = [IsAdminOrAbove]

    def _get_offer(self, offer_id, request):
        try:
            offer = DailyOffer.objects.get(id=offer_id)
        except DailyOffer.DoesNotExist:
            return None
        if request.user.role != "super_admin" and str(offer.branch_id) != str(request.user.branch_id):
            return None
        return offer

    def patch(self, request, offer_id):
        offer = self._get_offer(offer_id, request)
        if not offer:
            return err("Offer not found.", 404)

        was_active    = offer.is_active
        was_auto_bcast = offer.auto_broadcast

        serializer = DailyOfferWriteSerializer(offer, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        offer = serializer.save()
        _save_offer_extras(offer, request)

        newly_activated = offer.is_active and not was_active
        newly_flagged   = offer.auto_broadcast and not was_auto_bcast
        if offer.auto_broadcast and offer.is_active and (newly_activated or newly_flagged):
            _maybe_auto_broadcast(offer, request)

        return ok({"offer": DailyOfferSerializer(offer, context={"request": request}).data})

    def delete(self, request, offer_id):
        offer = self._get_offer(offer_id, request)
        if not offer:
            return err("Offer not found.", 404)
        offer.delete()
        return ok({"message": "Offer deleted."})


class OfferRedemptionListView(APIView):
    """GET /api/v1/offers/admin/redemptions/"""
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        if request.user.role == Role.SUPER_ADMIN:
            branch_id = request.query_params.get("branch_id")
            qs = OfferRedemption.objects.all()
            if branch_id:
                qs = qs.filter(offer__branch_id=branch_id)
        else:
            qs = OfferRedemption.objects.filter(offer__branch_id=request.user.branch_id)

        offer_id = request.query_params.get("offer_id")
        if offer_id:
            qs = qs.filter(offer_id=offer_id)

        qs = qs.select_related("offer", "customer", "order").order_by("-created_at")[:100]
        return ok({"redemptions": OfferRedemptionSerializer(qs, many=True).data})


class AdminReferralStatsView(APIView):
    """
    GET /api/v1/offers/admin/referral-stats/?offer_id=<uuid>
    Admin view of all referral activity for an offer.
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        offer_id = request.query_params.get("offer_id")
        if not offer_id:
            return err("offer_id is required.")

        try:
            offer = DailyOffer.objects.get(id=offer_id)
        except DailyOffer.DoesNotExist:
            return err("Offer not found.", 404)

        links = ReferralLink.objects.filter(offer=offer).select_related("referrer").prefetch_related("usages")
        data = []
        for link in links:
            usages = list(link.usages.select_related("referred_user"))
            data.append({
                "link_id":       str(link.id),
                "code":          link.code,
                "referrer":      link.referrer.name,
                "referrer_phone":link.referrer.phone or "",
                "visits":        link.used_count,
                "signups":       len(usages),
                "rewards_sent":  link.reward_sent_count,
                "usages": [{
                    "user":    u.referred_user.name,
                    "phone":   u.referred_user.phone or "",
                    "status":  u.status,
                    "coupon":  u.reward_coupon,
                    "joined":  u.created_at.isoformat(),
                } for u in usages],
            })

        return ok({
            "offer_name": offer.name,
            "total_links":    links.count(),
            "total_rewards_sent": sum(d["rewards_sent"] for d in data),
            "links": data,
        })


class AdminReEngagementPreviewView(APIView):
    """
    GET /api/v1/offers/admin/reengagement-preview/?offer_id=<uuid>
    Shows how many customers would be targeted by this re-engagement offer.
    POST — triggers the send immediately (manual fire).
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        offer_id = request.query_params.get("offer_id")
        if not offer_id:
            return err("offer_id is required.")

        try:
            offer = DailyOffer.objects.get(id=offer_id, offer_type=OfferType.RE_ENGAGEMENT)
        except DailyOffer.DoesNotExist:
            return err("Re-engagement offer not found.", 404)

        from django.utils import timezone
        import datetime
        cutoff = timezone.now() - datetime.timedelta(days=offer.inactive_days)
        branch_id = offer.branch_id

        from apps.accounts.models import User, Role
        from apps.orders.models import Order

        # Customers of this branch who have ordered before but not recently
        active_customers = Order.objects.filter(
            branch_id=branch_id,
            customer__isnull=False,
            created_at__gte=cutoff,
        ).values_list("customer_id", flat=True).distinct()

        all_customers = User.objects.filter(
            role=Role.CUSTOMER, is_active=True, phone__isnull=False
        ).exclude(phone="").exclude(id__in=active_customers)

        # Exclude already-sent
        already_sent = ReEngagementLog.objects.filter(offer=offer).values_list("customer_id", flat=True)
        targets = all_customers.exclude(id__in=already_sent)

        return ok({
            "inactive_days": offer.inactive_days,
            "target_count":  targets.count(),
            "already_sent":  len(already_sent),
        })

    def post(self, request):
        """Manually trigger re-engagement send for this offer."""
        offer_id = request.data.get("offer_id")
        if not offer_id:
            return err("offer_id is required.")

        try:
            offer = DailyOffer.objects.get(id=offer_id, offer_type=OfferType.RE_ENGAGEMENT)
        except DailyOffer.DoesNotExist:
            return err("Re-engagement offer not found.", 404)

        from apps.offers.tasks import send_reengagement_for_offer
        send_reengagement_for_offer.delay(str(offer.id))
        return ok({"message": "Re-engagement send queued successfully."})
