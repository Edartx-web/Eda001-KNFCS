"""
apps/offers/models.py

Offer types:
  PERCENTAGE     — % off entire cart or specific items/category
  FLAT           — Fixed ₹ off
  COMBO          — Bundle deal for specific items
  FREE_ITEM      — Buy X get Y free
  BOGO           — Buy one get one
  WELCOME        — First-order bonus (auto-applied after signup)
  REFERRAL       — Share link → referrer earns reward when friend orders
  RE_ENGAGEMENT  — "We Miss You" WhatsApp offer for inactive customers

Models:
  DailyOffer      — Main offer record
  OfferItem       — Items in a combo deal
  OfferRedemption — Audit trail of every redemption
  ReferralLink    — Unique shareable link per customer per offer
  ReferralUsage   — When a referred user signs up or places qualifying order
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class OfferType(models.TextChoices):
    PERCENTAGE     = "percentage",     "Percentage Discount"
    FLAT           = "flat",           "Flat Amount Off"
    COMBO          = "combo",          "Combo Deal"
    FREE_ITEM      = "free_item",      "Buy X Get Y Free"
    BOGO           = "bogo",           "Buy One Get One"
    WELCOME        = "welcome",        "Welcome / First-Order Bonus"
    REFERRAL       = "referral",       "Share & Get Reward"
    RE_ENGAGEMENT  = "re_engagement",  "We Miss You (Re-engagement)"
    SCRATCH_CARD   = "scratch_card",   "Scratch Card (Reveal & Win)"


class ReferralRewardType(models.TextChoices):
    COUPON   = "coupon",   "Coupon Code Discount"
    SCRATCH  = "scratch",  "Scratch Card"
    DISCOUNT = "discount", "Direct Cart Discount"


class DailyOffer(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch   = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE, related_name="offers"
    )
    name     = models.CharField(max_length=150)
    tagline  = models.CharField(max_length=200, blank=True)
    offer_type = models.CharField(max_length=20, choices=OfferType.choices)

    # ── Discount amounts ──────────────────────────────────────────────
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="e.g. 30 for 30% off"
    )
    discount_flat = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Flat ₹ amount off"
    )
    original_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    offer_price    = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # ── Media — poster image / video ──────────────────────────────────
    video           = models.FileField(
        upload_to="offers/videos/", null=True, blank=True,
        help_text="MP4 video ad — plays muted+autoplay in hero carousel"
    )
    video_thumbnail = models.ImageField(
        upload_to="offers/thumbnails/", null=True, blank=True,
        help_text="Poster frame shown before video loads"
    )
    image = models.ImageField(
        upload_to="offers/images/", null=True, blank=True,
        help_text="Offer poster — shown in cards and broadcast messages"
    )

    # ── Branding ──────────────────────────────────────────────────────
    emoji         = models.CharField(max_length=8, default="🔥")
    gradient_from = models.CharField(max_length=7, default="#1A0500")
    gradient_to   = models.CharField(max_length=7, default="#2D0A00")
    accent_color  = models.CharField(max_length=7, default="#E8521A")

    # ── Schedule & visibility ─────────────────────────────────────────
    start_at       = models.DateTimeField(default=timezone.now)
    end_at         = models.DateTimeField(
        null=True, blank=True,
        help_text="Leave blank for a lifetime / never-expiring offer"
    )
    is_active      = models.BooleanField(default=True)
    carousel_order = models.PositiveSmallIntegerField(default=0)

    # ── Scope — category and/or specific items ────────────────────────
    category   = models.ForeignKey(
        "menu.MenuCategory",
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="category_offers",
        help_text="Restrict offer to this category only (optional)",
    )
    applies_to = models.ManyToManyField(
        "menu.MenuItem", blank=True,
        related_name="offers",
        help_text="Restrict offer to these specific items (leave empty = all items)",
    )

    # ── Eligibility rules ─────────────────────────────────────────────
    first_order_only = models.BooleanField(
        default=False,
        help_text="Only customers placing their FIRST order can redeem this offer"
    )
    min_order_value = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Minimum cart subtotal required to apply this offer (₹)"
    )
    max_redemptions_per_user = models.PositiveSmallIntegerField(
        default=0,
        help_text="0 = unlimited. Max times one customer can redeem."
    )
    coupon_code = models.CharField(
        max_length=30, blank=True, default="",
        help_text="Admin-set code customers enter in cart to claim this offer"
    )
    require_coupon = models.BooleanField(
        default=False,
        help_text="If True, coupon_code MUST be entered — offer cannot be auto-applied"
    )

    # ── WELCOME type extras ───────────────────────────────────────────
    welcome_bonus_amount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Fixed ₹ bonus for new users (WELCOME type)"
    )

    # ── REFERRAL type extras ──────────────────────────────────────────
    referral_reward_type = models.CharField(
        max_length=15, choices=ReferralRewardType.choices,
        default=ReferralRewardType.COUPON,
        help_text="What the referrer earns when their friend qualifies"
    )
    referral_reward_value = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="₹ value or % of reward for referrer"
    )
    referral_min_friend_order = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Minimum order value the referred friend must place to trigger reward"
    )
    referral_reward_on_signup = models.BooleanField(
        default=False,
        help_text="Give reward immediately when friend signs up (not waiting for first order)"
    )

    # ── RE_ENGAGEMENT type extras ─────────────────────────────────────
    inactive_days = models.PositiveSmallIntegerField(
        default=7,
        help_text="Send to customers who have not ordered in this many days"
    )
    reengagement_message = models.TextField(
        blank=True,
        help_text="Custom WhatsApp message. Use {name}, {discount}, {code} as placeholders."
    )

    # ── Broadcast / global settings ───────────────────────────────────
    all_branches   = models.BooleanField(
        default=False,
        help_text="Show to customers of ALL branches (SuperAdmin global offer)"
    )
    selected_branches = models.ManyToManyField(
        "branches.Branch",
        blank=True,
        related_name="selected_offers",
        help_text="Apply to these specific branches (leave empty = FK branch only)",
    )
    auto_broadcast = models.BooleanField(
        default=False,
        help_text="Auto-broadcast to branch customers when this offer is activated"
    )

    # ── Stats ─────────────────────────────────────────────────────────
    view_count       = models.PositiveIntegerField(default=0)
    redemption_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "daily_offers"
        ordering = ["carousel_order", "-created_at"]
        indexes  = [
            models.Index(fields=["branch", "is_active"]),
            models.Index(fields=["offer_type", "is_active"]),
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
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer      = models.ForeignKey(DailyOffer, on_delete=models.CASCADE, related_name="redemptions")
    customer   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order      = models.ForeignKey("orders.Order", on_delete=models.CASCADE)
    savings    = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offer_redemptions"

    def __str__(self):
        return f"{self.customer} redeemed {self.offer.name} — saved ₹{self.savings}"


class ReferralLink(models.Model):
    """
    One unique referral link per customer per REFERRAL offer.
    The short code is embedded in the shareable URL.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer      = models.ForeignKey(DailyOffer, on_delete=models.CASCADE, related_name="referral_links")
    referrer   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="referral_links_created"
    )
    code       = models.CharField(max_length=20, unique=True)
    used_count = models.PositiveIntegerField(default=0)
    reward_sent_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = "referral_links"
        unique_together = [("offer", "referrer")]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.referrer.name} → {self.offer.name} [{self.code}]"


class ReferralUsage(models.Model):
    """
    Tracks each referral event:
      - referred_user signs up via the link
      - referred_user places a qualifying order
      - referrer reward is granted
    """
    STATUS_SIGNED_UP    = "signed_up"
    STATUS_ORDERED      = "ordered"
    STATUS_REWARD_SENT  = "reward_sent"
    STATUS_CHOICES = [
        (STATUS_SIGNED_UP,   "Referred user signed up"),
        (STATUS_ORDERED,     "Referred user placed qualifying order"),
        (STATUS_REWARD_SENT, "Referrer reward granted"),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    link           = models.ForeignKey(ReferralLink, on_delete=models.CASCADE, related_name="usages")
    referred_user  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="referral_usages"
    )
    status         = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_SIGNED_UP)
    qualifying_order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text="The friend's first qualifying order"
    )
    reward_coupon  = models.CharField(max_length=30, blank=True,
                                      help_text="One-time coupon code sent to referrer as reward")
    created_at     = models.DateTimeField(auto_now_add=True)
    rewarded_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table        = "referral_usages"
        unique_together = [("link", "referred_user")]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.referred_user.name} via {self.link.referrer.name} [{self.status}]"


class ReEngagementLog(models.Model):
    """
    Records each re-engagement WhatsApp message sent so we never
    send the same offer to the same customer twice in the same cycle.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer      = models.ForeignKey(DailyOffer, on_delete=models.CASCADE, related_name="reengagement_logs")
    customer   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    sent_at    = models.DateTimeField(auto_now_add=True)
    coupon_sent = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table        = "reengagement_logs"
        unique_together = [("offer", "customer")]

    def __str__(self):
        return f"Re-engagement: {self.customer.name} ← {self.offer.name}"
