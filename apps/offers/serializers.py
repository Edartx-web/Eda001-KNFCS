"""apps/offers/serializers.py"""
from rest_framework import serializers
from .models import DailyOffer, OfferItem, OfferRedemption, ReferralLink, ReferralUsage


class OfferItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model  = OfferItem
        fields = ["id", "menu_item", "menu_item_name", "quantity", "notes"]


class DailyOfferSerializer(serializers.ModelSerializer):
    offer_items       = OfferItemSerializer(many=True, read_only=True)
    is_valid_now      = serializers.ReadOnlyField()
    branch_name       = serializers.CharField(source="branch.name", read_only=True)
    user_can_redeem   = serializers.SerializerMethodField()
    image_url         = serializers.SerializerMethodField()
    video_url         = serializers.SerializerMethodField()
    thumbnail_url     = serializers.SerializerMethodField()
    category_name     = serializers.CharField(source="category.name", read_only=True, default=None)
    applies_to_details = serializers.SerializerMethodField()

    def get_applies_to_details(self, obj):
        return [{"id": str(i.id), "name": i.name} for i in obj.applies_to.all()]

    class Meta:
        model  = DailyOffer
        fields = [
            "id", "branch", "branch_name", "name", "tagline", "offer_type",
            "discount_percentage", "discount_flat", "original_price", "offer_price",
            "video", "video_url", "video_thumbnail", "thumbnail_url",
            "image", "image_url",
            "emoji", "gradient_from", "gradient_to", "accent_color",
            "start_at", "end_at", "is_active", "carousel_order",
            "category", "category_name", "applies_to", "applies_to_details", "first_order_only",
            "min_order_value", "max_redemptions_per_user",
            "coupon_code", "require_coupon",
            # WELCOME
            "welcome_bonus_amount",
            # REFERRAL
            "referral_reward_type", "referral_reward_value",
            "referral_min_friend_order", "referral_reward_on_signup",
            # RE_ENGAGEMENT
            "inactive_days", "reengagement_message",
            "auto_broadcast", "all_branches", "selected_branches",
            "view_count", "redemption_count",
            "created_at", "updated_at",
            "offer_items", "is_valid_now", "user_can_redeem",
        ]
        read_only_fields = ["view_count", "redemption_count", "created_at", "updated_at"]

    def _abs(self, url):
        from django.conf import settings as _s
        base = getattr(_s, "BACKEND_URL", "http://localhost:1000").rstrip("/")
        return f"{base}{url}" if not url.startswith("http") else url

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        try:
            return self._abs(obj.image.url)
        except Exception:
            return None

    def get_video_url(self, obj):
        if not obj.video:
            return None
        try:
            return self._abs(obj.video.url)
        except Exception:
            return None

    def get_thumbnail_url(self, obj):
        if not obj.video_thumbnail:
            return None
        try:
            return self._abs(obj.video_thumbnail.url)
        except Exception:
            return None

    def get_user_can_redeem(self, obj):
        if obj.max_redemptions_per_user <= 0:
            return True
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return True
        count = OfferRedemption.objects.filter(offer=obj, customer=request.user).count()
        return count < obj.max_redemptions_per_user


class DailyOfferWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DailyOffer
        fields = [
            "name", "tagline", "offer_type",
            "discount_percentage", "discount_flat", "original_price", "offer_price",
            "video", "video_thumbnail", "image",
            "emoji", "gradient_from", "gradient_to", "accent_color",
            "start_at", "end_at", "is_active", "carousel_order",
            "category", "first_order_only",
            "min_order_value", "max_redemptions_per_user",
            "coupon_code", "require_coupon",
            "welcome_bonus_amount",
            "referral_reward_type", "referral_reward_value",
            "referral_min_friend_order", "referral_reward_on_signup",
            "inactive_days", "reengagement_message",
            "auto_broadcast", "all_branches", "selected_branches",
        ]


class OfferRedemptionSerializer(serializers.ModelSerializer):
    offer_name    = serializers.CharField(source="offer.name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model  = OfferRedemption
        fields = ["id", "offer", "offer_name", "customer", "customer_name",
                  "order", "savings", "created_at"]


class ReferralLinkSerializer(serializers.ModelSerializer):
    offer_name    = serializers.CharField(source="offer.name", read_only=True)
    referrer_name = serializers.CharField(source="referrer.name", read_only=True)
    share_url     = serializers.SerializerMethodField()

    class Meta:
        model  = ReferralLink
        fields = [
            "id", "offer", "offer_name", "referrer", "referrer_name",
            "code", "used_count", "reward_sent_count", "share_url", "created_at",
        ]

    def get_share_url(self, obj):
        request = self.context.get("request")
        from django.conf import settings as dj_settings
        base = getattr(dj_settings, "SITE_URL", "https://knfcs.com")
        return f"{base}/refer/{obj.code}"


class ReferralUsageSerializer(serializers.ModelSerializer):
    referred_user_name = serializers.CharField(source="referred_user.name", read_only=True)
    referred_user_phone = serializers.CharField(source="referred_user.phone", read_only=True)

    class Meta:
        model  = ReferralUsage
        fields = [
            "id", "link", "referred_user", "referred_user_name", "referred_user_phone",
            "status", "qualifying_order", "reward_coupon", "created_at", "rewarded_at",
        ]
