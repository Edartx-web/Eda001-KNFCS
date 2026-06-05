"""
apps/branches/site_config.py

SiteConfig — Global settings controlled exclusively by SuperAdmin.
Singleton model (only one row, always pk=1).

Settings:
  - Loyalty program (earn rate, redeem rate, enabled toggle)
  - Spin-the-wheel game (enabled, max uses per customer, prizes)
  - Scratch coupon game (enabled, discount percent)
  - Min order for loyalty redemption
"""
import uuid
from django.db import models


class SiteConfig(models.Model):
    """
    Singleton — always pk=1.
    Use SiteConfig.get() to access anywhere in the codebase.
    """
    # ── Loyalty programme ──────────────────────────────────────────────
    loyalty_enabled      = models.BooleanField(
        default=True,
        help_text="Master switch — if False, no points are earned or redeemed"
    )
    loyalty_earn_rate    = models.DecimalField(
        max_digits=6, decimal_places=2, default=1.00,
        help_text="Points earned per ₹1 spent. e.g. 1.0 = 1 pt per ₹1"
    )
    loyalty_redeem_rate  = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.10,
        help_text="₹ value of 1 loyalty point. e.g. 0.10 = 100 pts = ₹10"
    )
    loyalty_min_redeem   = models.PositiveIntegerField(
        default=100,
        help_text="Minimum points required to redeem in one transaction"
    )
    loyalty_redeem_step  = models.PositiveIntegerField(
        default=100,
        help_text="Points must be redeemed in multiples of this number"
    )
    loyalty_max_redeem_pct = models.PositiveSmallIntegerField(
        default=50,
        help_text="Maximum % of order total that can be paid with loyalty points"
    )

    # ── Spin-the-Wheel ────────────────────────────────────────────────
    spin_enabled         = models.BooleanField(default=True)
    spin_max_uses        = models.PositiveSmallIntegerField(
        default=1,
        help_text="Max times a single customer can spin per day (0 = unlimited)"
    )
    # Prizes stored as JSON: [{label, color, prob, discount_pct}, ...]
    spin_prizes          = models.JSONField(default=list, blank=True,
        help_text='JSON array of prize objects: [{label, color, prob, discount_pct}]'
    )

    # ── Login Page Customisation (SuperAdmin only) ────────────────────
    login_image          = models.ImageField(
        upload_to="site/login/", null=True, blank=True,
        help_text="Background image shown on the customer login page"
    )
    login_video_url      = models.CharField(
        max_length=500, blank=True, default="",
        help_text="URL of video to play on the login page desktop hero (leave blank to use default)"
    )
    login_slides         = models.JSONField(
        default=list, blank=True,
        help_text=(
            'JSON array of mobile slide objects. Each: '
            '{"word":"CRAVE","sub":"Crispy fried chicken",'
            '"gradient":"linear-gradient(...)","accent":"#e06000",'
            '"img":"/assets/image/dishes/dish-0.png"}'
        )
    )

    # ── Home Section Images ───────────────────────────────────────────
    home_section_images  = models.JSONField(
        default=dict, blank=True,
        help_text=(
            'Images shown as banners for themed home-page sections. '
            'Keys: "is_hotdeals", "is_chicken", "is_snacks", "is_cold_drinks". '
            'Each value: {"image_url": "...", "tagline": "..."}'
        )
    )

    # ── Home Page Ads ─────────────────────────────────────────────────
    home_ads             = models.JSONField(
        default=list, blank=True,
        help_text='JSON array of home page banner ads. Each: {"id","title","image_url","link","active"}'
    )

    # ── General Site URL ──────────────────────────────────────────────
    site_url             = models.CharField(
        max_length=200, blank=True, default="",
        help_text="Frontend URL used in WhatsApp offer links (e.g. https://knfcs.com)"
    )

    # ── Scratch Coupon ────────────────────────────────────────────────
    scratch_enabled      = models.BooleanField(default=True)
    scratch_discount_pct = models.PositiveSmallIntegerField(
        default=15,
        help_text="Discount % revealed by the scratch card"
    )
    scratch_max_uses     = models.PositiveSmallIntegerField(
        default=1,
        help_text="Max times a customer can use scratch card per day"
    )
    scratch_coupon_code  = models.CharField(
        max_length=20, default="SCRATCH15",
        help_text="Coupon code revealed by scratch card"
    )

    # ── Contact Us ───────────────────────────────────────────────────
    contact_phone      = models.CharField(max_length=25, blank=True, default="",
        help_text="Phone number shown on Contact page and footer")
    contact_email      = models.EmailField(blank=True, default="",
        help_text="Support email address")
    contact_wa_number  = models.CharField(max_length=25, blank=True, default="",
        help_text="WhatsApp number for chat support (digits only, e.g. 919876543210)")
    contact_address    = models.TextField(blank=True, default="",
        help_text="Physical address shown on Contact and About pages")

    # ── About page ────────────────────────────────────────────────────
    about_headline     = models.CharField(max_length=200, blank=True, default="About KNFC Fried Chicken")
    about_tagline      = models.CharField(max_length=300, blank=True, default="")
    about_content      = models.TextField(blank=True, default="",
        help_text="Rich text / paragraphs for the About page body")
    about_image        = models.ImageField(upload_to="site/about/", null=True, blank=True)
    about_video_url    = models.CharField(max_length=500, blank=True, default="",
        help_text="YouTube / direct MP4 URL for About page hero video")
    about_stats        = models.JSONField(default=list, blank=True,
        help_text='[{"label":"Branches","value":"3"},{"label":"Happy Customers","value":"10000+"}]')

    # ── Blog posts ────────────────────────────────────────────────────
    blog_posts         = models.JSONField(default=list, blank=True,
        help_text='[{"id","title","slug","excerpt","content","image_url","author","date","tags":[]}]')

    # ── Careers ───────────────────────────────────────────────────────
    careers_intro      = models.TextField(blank=True, default="",
        help_text="Intro text for the Careers page")
    careers_openings   = models.JSONField(default=list, blank=True,
        help_text='[{"title","department","location","type":"Full-time","description","apply_email"}]')

    # ── Re-engagement global default ──────────────────────────────────
    reengagement_default_days = models.PositiveSmallIntegerField(default=7,
        help_text="Default inactive_days used when creating re-engagement offers")

    # ── Footer visibility ─────────────────────────────────────────────
    footer_show_map    = models.BooleanField(default=True, help_text="Show Google Map in desktop footer")
    footer_map_query   = models.CharField(max_length=200, blank=True, default="KNFC+Fried+Chicken",
        help_text="Google Maps search query for the footer embed")

    # ── Singleton boilerplate ─────────────────────────────────────────
    class Meta:
        db_table     = "site_config"
        verbose_name = "Site Configuration"

    def __str__(self):
        return "Global Site Configuration"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # prevent deletion

    @classmethod
    def get(cls):
        """Always returns the singleton. Creates with defaults if needed."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
