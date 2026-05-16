"""
apps/offers/models.py
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class OfferType(models.TextChoices):
    PERCENTAGE = "percentage", "Percentage Discount"
    FLAT       = "flat",       "Flat Amount Off"
    COMBO      = "combo",      "Combo Deal"
    FREE_ITEM  = "free_item",  "Buy X Get Y Free"
    BOGO       = "bogo",       "Buy One Get One"


class DailyOffer(models.Model):
    id                     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch                 = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE, related_name="offers"
    )
    name                   = models.CharField(max_length=150)
    tagline                = models.CharField(max_length=200, blank=True)
    offer_type             = models.CharField(max_length=20, choices=OfferType.choices)

    discount_percentage    = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="e.g. 30 for 30% off"
    )
    discount_flat          = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Flat amount off in ₹"
    )
    original_price         = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    offer_price            = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    video                  = models.FileField(
        upload_to="offers/videos/", null=True, blank=True,
        help_text="MP4 video ad — plays muted+autoplay in hero carousel"
    )
    video_thumbnail        = models.ImageField(
        upload_to="offers/thumbnails/", null=True, blank=True,
        help_text="Poster frame shown before video loads"
    )
    image                  = models.ImageField(
        upload_to="offers/images/", null=True, blank=True,
        help_text="Static image — used if no video uploaded"
    )

    emoji                  = models.CharField(max_length=8, default="🔥")
    gradient_from          = models.CharField(max_length=7, default="#1A0500")
    gradient_to            = models.CharField(max_length=7, default="#2D0A00")
    accent_color           = models.CharField(max_length=7, default="#E8521A")

    start_at               = models.DateTimeField(default=timezone.now)
    end_at                 = models.DateTimeField(
        null=True, blank=True,
        help_text="Leave blank for a lifetime / never-expiring offer"
    )
    is_active              = models.BooleanField(default=True)
    carousel_order         = models.PositiveSmallIntegerField(default=0)

    category               = models.ForeignKey(
        "menu.MenuCategory",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="category_offers",
        help_text="Restrict this offer to one category only (optional)",
    )
    applies_to             = models.ManyToManyField(
        "menu.MenuItem",
        blank=True,
        related_name="offers",
        help_text="Leave empty to apply to all items in the combo",
    )

    first_order_only       = models.BooleanField(
        default=False,
        help_text="If True, only customers placing their FIRST order can redeem this offer"
    )
    min_order_value        = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Minimum cart subtotal required to apply this offer (₹)"
    )
    max_redemptions_per_user = models.PositiveSmallIntegerField(
        default=0,
        help_text="0 = unlimited. Max times one customer can redeem this offer."
    )
    coupon_code            = models.CharField(
        max_length=30, blank=True, default="",
        help_text="Short code customers enter in cart to apply this offer"
    )

    auto_broadcast         = models.BooleanField(
        default=False,
        help_text="Automatically broadcast to branch customers when this offer is activated"
    )

    view_count             = models.PositiveIntegerField(default=0)
    redemption_count       = models.PositiveIntegerField(default=0)

    created_at             = models.DateTimeField(auto_now_add=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "daily_offers"
        ordering = ["carousel_order", "-created_at"]
        indexes  = [
            models.Index(fields=["branch", "is_active"]),
            models.Index(fields=["start_at", "end_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.branch})"

    @property
    def is_valid_now(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.start_at and now < self.start_at:
            return False
        if self.end_at and now > self.end_at:
            return False
        return True


class OfferItem(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer     = models.ForeignKey(DailyOffer, on_delete=models.CASCADE, related_name="offer_items")
    menu_item = models.ForeignKey("menu.MenuItem", on_delete=models.CASCADE)
    quantity  = models.PositiveSmallIntegerField(default=1)
    notes     = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "offer_items"

    def __str__(self):
        return f"{self.offer.name} — {self.menu_item} × {self.quantity}"


class OfferRedemption(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer    = models.ForeignKey(DailyOffer, on_delete=models.CASCADE, related_name="redemptions")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order    = models.ForeignKey("orders.Order", on_delete=models.CASCADE)
    savings  = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offer_redemptions"

    def __str__(self):
        return f"{self.customer} redeemed {self.offer.name} — saved ₹{self.savings}"
