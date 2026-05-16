"""apps/offers/views.py"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import F

from .models import DailyOffer, OfferRedemption
from .serializers import DailyOfferSerializer, DailyOfferWriteSerializer, OfferRedemptionSerializer
from apps.accounts.permissions import IsAdminOrAbove, get_request_branch_id

import logging
logger = logging.getLogger(__name__)


def _maybe_auto_broadcast(offer, request):
    """Queue a broadcast if the offer has auto_broadcast=True and is now active.
    Sends to ALL customers with a phone number (target=all)."""
    if not offer.auto_broadcast or not offer.is_active:
        return
    try:
        from apps.notifications.models import BroadcastLog
        from apps.notifications.views import build_offer_caption
        from apps.notifications.tasks import run_broadcast_in_thread

        image_url = request.build_absolute_uri(offer.image.url) if offer.image else ""
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
        logger.info(
            f"Auto-broadcast queued for offer {offer.id} → broadcast {broadcast.id} (target=all)"
        )
    except Exception as e:
        logger.error(f"Auto-broadcast failed for offer {offer.id}: {e}")




def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


class ActiveOffersView(APIView):
    """GET /api/v1/offers/ — active offers for a branch."""
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        now = timezone.now()
        offers = DailyOffer.objects.filter(
            branch_id=branch_id,
            is_active=True,
            start_at__lte=now,
        ).filter(
            end_at__isnull=True
        ) | DailyOffer.objects.filter(
            branch_id=branch_id,
            is_active=True,
            start_at__lte=now,
            end_at__gte=now,
        )
        offers = offers.order_by("carousel_order", "-created_at")

        # Increment view count for carousel impressions (bulk, no per-offer granularity needed)
        offers_list = list(offers)
        DailyOffer.objects.filter(
            id__in=[o.id for o in offers_list]
        ).update(view_count=F("view_count") + 1)

        return ok({"offers": DailyOfferSerializer(offers_list, many=True, context={"request": request}).data})


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
    """GET /api/v1/offers/coupon/?code=SAVE20&branch_id=<uuid>"""
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
            return err("Invalid or expired coupon code.", status.HTTP_404_NOT_FOUND)

        if not offer.is_valid_now:
            return err("This coupon has expired.")

        if offer.max_redemptions_per_user > 0 and request.user.is_authenticated:
            already = OfferRedemption.objects.filter(offer=offer, customer=request.user).count()
            if already >= offer.max_redemptions_per_user:
                return err("You have already used this offer.")

        return ok({"offer": DailyOfferSerializer(offer, context={"request": request}).data})


class AdminOfferCreateView(APIView):
    """GET/POST /api/v1/offers/admin/ — list or create offers."""
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        from django.db.models import Q
        now = timezone.now()
        qs = DailyOffer.objects.filter(
            is_active=True
        ).filter(
            Q(end_at__isnull=True) | Q(end_at__gte=now)
        )
        if request.user.role != Role.SUPER_ADMIN:
            qs = qs.filter(branch_id=request.user.branch_id)
        qs = qs.order_by("carousel_order", "-created_at")
        return ok({"offers": DailyOfferSerializer(qs, many=True, context={"request": request}).data})

    def post(self, request):
        branch_id = get_request_branch_id(request) or request.data.get("branch_id")
        if not branch_id:
            return err("branch_id is required (super admin must pass branch_id).")

        from apps.branches.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return err("Branch not found.")

        serializer = DailyOfferWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        offer = serializer.save(branch=branch)
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
            return err("Offer not found.", status.HTTP_404_NOT_FOUND)

        was_active       = offer.is_active
        was_auto_bcast   = offer.auto_broadcast

        serializer = DailyOfferWriteSerializer(offer, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        offer = serializer.save()

        # Trigger auto-broadcast when: offer just activated OR auto_broadcast just turned on
        newly_activated = offer.is_active and not was_active
        newly_flagged   = offer.auto_broadcast and not was_auto_bcast
        if offer.auto_broadcast and offer.is_active and (newly_activated or newly_flagged):
            _maybe_auto_broadcast(offer, request)

        return ok({"offer": DailyOfferSerializer(offer, context={"request": request}).data})

    def delete(self, request, offer_id):
        offer = self._get_offer(offer_id, request)
        if not offer:
            return err("Offer not found.", status.HTTP_404_NOT_FOUND)
        offer.delete()
        return ok({"message": "Offer deleted."})


class OfferRedemptionListView(APIView):
    """GET /api/v1/offers/admin/redemptions/ — redemption history for branch."""
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
