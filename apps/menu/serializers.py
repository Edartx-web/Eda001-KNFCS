"""
apps/menu/serializers.py
Serializers for all menu data — categories, items, reviews, customisations.
"""

from rest_framework import serializers
from apps.menu.models import MenuCategory, MenuItem, ItemCustomisation, ItemReview


def _abs_url(url, request):
    """Return an absolute URL. If url is already absolute (Supabase S3), return as-is."""
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if request:
        return request.build_absolute_uri(url)
    from django.conf import settings
    base = getattr(settings, "BACKEND_URL", "http://localhost:1000").rstrip("/")
    return f"{base}{url}"


class ItemCustomisationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ItemCustomisation
        fields = ["id", "name", "extra_price", "is_default", "display_order"]


class ItemReviewSerializer(serializers.ModelSerializer):
    customer_name  = serializers.CharField(source="customer.name", read_only=True)
    customer_phone = serializers.SerializerMethodField()
    photo_url      = serializers.SerializerMethodField()

    class Meta:
        model  = ItemReview
        fields = [
            "id", "customer_name", "customer_phone",
            "rating", "comment", "photo_url",
            "admin_reply", "created_at",
        ]

    def get_customer_phone(self, obj):
        # Mask phone for privacy: +91 ••••••4210
        phone = obj.customer.phone or ""
        if len(phone) >= 4:
            return phone[:-4].replace(phone[:-10], "••••••") + phone[-4:]
        return "••••••"

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        return _abs_url(obj.photo.url, self.context.get("request"))


class MenuItemListSerializer(serializers.ModelSerializer):
    discounted_price = serializers.SerializerMethodField()
    savings_amount   = serializers.SerializerMethodField()

    def get_discounted_price(self, obj):
        try:
            p = obj.get_discounted_price()
            return str(p) if p is not None else str(obj.price)
        except Exception:
            return str(obj.price)

    def get_savings_amount(self, obj):
        try:
            s = obj.savings_amount
            return str(s) if s is not None else "0"
        except Exception:
            return "0"

    """Lightweight serializer for product grid/list views."""
    image_url         = serializers.SerializerMethodField()
    dietary_dot       = serializers.ReadOnlyField()
    prep_time_display = serializers.ReadOnlyField()
    is_on_offer       = serializers.SerializerMethodField()
    offer_price       = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        return _abs_url(obj.image.url, self.context.get("request"))
    offer_label      = serializers.SerializerMethodField()
    stock_status     = serializers.SerializerMethodField()
    stock_remaining  = serializers.SerializerMethodField()
    category_name    = serializers.CharField(source="category.name", read_only=True)
    category_slug    = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model  = MenuItem
        fields = [
            "id", "name", "slug", "description",
            "price", "image_url", "emoji",
            "dietary_type", "dietary_dot",
            "spice_level", "calories",
            "avg_rating", "review_count", "discounted_price", "savings_amount",
            "prep_time_display",
            "is_available", "is_featured", "is_new", "is_bestseller",
            "is_hotdeals", "is_chicken", "is_snacks", "is_cold_drinks",
            "is_buckets", "is_combo",
            "discount", "measurement_unit", "unit_quantity",
            "is_on_offer", "offer_price", "offer_label",
            "stock_status", "stock_remaining",
            "category", "category_name", "category_slug",
            "all_branches",
        ]

    def get_stock_status(self, obj):
        record = self._get_stock_record(obj)
        return record.status if record else "out"

    def get_stock_remaining(self, obj):
        record = self._get_stock_record(obj)
        return record.remaining_stock if record else 0

    def get_is_on_offer(self, obj):
        return any(o.is_active for o in obj.offers.all())

    def get_offer_price(self, obj):
        offer = self._active_offer(obj)
        return str(offer.offer_price) if offer and offer.offer_price else None

    def get_offer_label(self, obj):
        offer = self._active_offer(obj)
        if not offer:
            return None
        if offer.discount_percentage:
            return f"-{int(offer.discount_percentage)}%"
        if offer.discount_flat:
            return f"-₹{int(offer.discount_flat)}"
        return "Offer"

    def _active_offer(self, obj):
        for o in obj.offers.all():
            if o.is_active:
                return o
        return None

    def _get_stock_record(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        for r in obj.stock_records.all():
            if r.date == today:
                return r
        return None


class MenuItemDetailSerializer(MenuItemListSerializer):
    """Full serializer for product detail page."""
    customisations = ItemCustomisationSerializer(many=True, read_only=True)
    reviews        = serializers.SerializerMethodField()
    related_items  = serializers.SerializerMethodField()
    active_offer   = serializers.SerializerMethodField()
    gallery_images = serializers.SerializerMethodField()

    class Meta(MenuItemListSerializer.Meta):
        fields = MenuItemListSerializer.Meta.fields + [
            "customisations", "reviews",
            "related_items", "active_offer",
            "low_stock_threshold", "gallery_images",
        ]

    def get_gallery_images(self, obj):
        request = self.context.get("request")
        images = []
        for img in obj.gallery_images.all():
            if img.image:
                from django.conf import settings as _s
                _base = getattr(_s, "BACKEND_URL", "http://localhost:1000").rstrip("/")
                url = _abs_url(img.image.url, request)
                images.append({"id": str(img.id), "url": url})
        return images

    def get_reviews(self, obj):
        qs = obj.reviews.filter(is_visible=True).order_by("-created_at")[:10]
        return ItemReviewSerializer(qs, many=True, context=self.context).data

    def get_related_items(self, obj):
        """Items in same category, excluding this one."""
        qs = MenuItem.objects.filter(
            category=obj.category,
            is_available=True,
            branch=obj.branch,
        ).exclude(id=obj.id).order_by("?")[:6]
        return MenuItemListSerializer(qs, many=True, context=self.context).data

    def get_active_offer(self, obj):
        from apps.offers.serializers import DailyOfferSerializer
        offer = obj.offers.filter(is_active=True).first()
        if offer:
            return DailyOfferSerializer(offer, context=self.context).data
        return None


class MenuCategoryListSerializer(serializers.ModelSerializer):
    item_count      = serializers.SerializerMethodField()
    available_count = serializers.SerializerMethodField()
    image           = serializers.SerializerMethodField()

    class Meta:
        model  = MenuCategory
        fields = [
            "id", "name", "slug", "description",
            "image", "emoji",
            "gradient_from", "gradient_to",
            "item_count", "available_count",
            "display_order", "is_active", "all_branches",
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        return _abs_url(obj.image.url, self.context.get("request"))

    def get_item_count(self, obj):
        return obj.items.count()

    def get_available_count(self, obj):
        return obj.items.filter(is_available=True).count()


class MenuCategoryDetailSerializer(MenuCategoryListSerializer):
    """Category + all its items — used for product list page."""
    items = MenuItemListSerializer(many=True, read_only=True)

    class Meta(MenuCategoryListSerializer.Meta):
        fields = MenuCategoryListSerializer.Meta.fields + ["items"]


class CreateReviewSerializer(serializers.Serializer):
    menu_item_id = serializers.UUIDField()
    order_id     = serializers.UUIDField(required=False)
    rating       = serializers.IntegerField(min_value=1, max_value=5)
    comment      = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    photo        = serializers.ImageField(required=False)

    def validate_menu_item_id(self, value):
        from apps.menu.models import MenuItem
        try:
            MenuItem.objects.get(id=value)
        except MenuItem.DoesNotExist:
            raise serializers.ValidationError("Menu item not found.")
        return value
