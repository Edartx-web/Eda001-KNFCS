"""apps/offers/serializers.py"""
from rest_framework import serializers
from .models import DailyOffer, OfferItem, OfferRedemption


class OfferItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model  = OfferItem
        fields = ["id", "menu_item", "menu_item_name", "quantity", "notes"]


class DailyOfferSerializer(serializers.ModelSerializer):
    offer_items     = OfferItemSerializer(many=True, read_only=True)
    is_valid_now    = serializers.ReadOnlyField()
    branch_name     = serializers.CharField(source="branch.name", read_only=True)
    user_can_redeem = serializers.SerializerMethodField()

    class Meta:
        model  = DailyOffer
        fields = [
            "id", "branch", "branch_name", "name", "tagline", "offer_type",
            "discount_percentage", "discount_flat", "original_price", "offer_price",
            "video", "video_thumbnail", "image",
            "emoji", "gradient_from", "gradient_to", "accent_color",
            "start_at", "end_at", "is_active", "carousel_order",
            "category", "applies_to", "first_order_only",
            "min_order_value", "max_redemptions_per_user", "coupon_code",
            "auto_broadcast",
            "view_count", "redemption_count",
            "created_at", "updated_at",
            "offer_items", "is_valid_now", "user_can_redeem",
        ]
        read_only_fields = ["view_count", "redemption_count", "created_at", "updated_at"]

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
            "category", "applies_to", "first_order_only",
            "min_order_value", "max_redemptions_per_user", "coupon_code",
            "auto_broadcast",
        ]


class OfferRedemptionSerializer(serializers.ModelSerializer):
    offer_name    = serializers.CharField(source="offer.name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model  = OfferRedemption
        fields = ["id", "offer", "offer_name", "customer", "customer_name",
                  "order", "savings", "created_at"]
