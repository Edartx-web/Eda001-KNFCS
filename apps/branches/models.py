"""apps/branches/models.py"""
import uuid
from django.db import models
from apps.branches.site_config import SiteConfig  # noqa: F401 — re-export
from apps.branches.spin_log    import SpinLog      # noqa: F401 — re-export


class Branch(models.Model):
    """One physical shop location. All data is scoped to a branch."""

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name            = models.CharField(max_length=150)
    address         = models.TextField()
    phone           = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    qr_code         = models.ImageField(upload_to="qr_codes/", null=True, blank=True)
    max_tables = models.PositiveSmallIntegerField(
        default=20,
        help_text="Maximum number of dine-in tables."
    )
    # Order modes — SuperAdmin and BranchAdmin can restrict to pickup-only or dine-in-only
    enable_pickup    = models.BooleanField(default=True,  help_text="Allow pickup orders at this branch")
    enable_dine_in   = models.BooleanField(default=True,  help_text="Allow dine-in orders at this branch")
    pickup_upi_only  = models.BooleanField(default=False, help_text="If true, pickup orders must pay via UPI only")
    operating_hours = models.JSONField(default=dict, blank=True)
    # Geolocation — used by customer app to find nearest branch
    latitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude       = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table             = "branches"
        verbose_name         = "Branch"
        verbose_name_plural  = "Branches"
        ordering             = ["name"]

    def __str__(self):
        return f"{self.name} ({'Active' if self.is_active else 'Inactive'})"
    def save(self, *args, **kwargs):
        # Ensure name is always stored in title case
        self.name = self.name.strip().title()
        super().save(*args, **kwargs)