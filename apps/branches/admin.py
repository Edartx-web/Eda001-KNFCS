"""apps/branches/admin.py"""
from django.contrib import admin
from apps.branches.models import Branch


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display   = ("name", "phone", "email", "is_active", "created_at")
    list_filter    = ("is_active",)
    search_fields  = ("name", "address", "email")
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("id", "name", "address", "phone", "email", "qr_code", "operating_hours", "latitude", "longitude")}),
        ("Status", {"fields": ("is_active",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
from apps.branches.site_config import SiteConfig

@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    """Singleton config — only one row exists."""
    fieldsets = (
        ("Loyalty Programme", {"fields": (
            "loyalty_enabled", "loyalty_earn_rate", "loyalty_redeem_rate",
            "loyalty_min_redeem", "loyalty_redeem_step", "loyalty_max_redeem_pct",
        )}),
        ("Spin Wheel Game", {"fields": (
            "spin_enabled", "spin_max_uses", "spin_prizes",
        )}),
        ("Scratch Coupon Game", {"fields": (
            "scratch_enabled", "scratch_discount_pct", "scratch_max_uses", "scratch_coupon_code",
        )}),
        ("Login Page", {"fields": (
            "login_image", "login_video_url", "login_slides",
        )}),
        ("Site Settings", {"fields": (
            "site_url",
        )}),
    )

    def has_add_permission(self, request):
        try:
            return not SiteConfig.objects.exists()
        except Exception:
            # Table doesn't exist yet — migration not run. Allow add.
            return True

    def has_delete_permission(self, request, obj=None):
        return False
