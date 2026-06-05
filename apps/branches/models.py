"""apps/branches/models.py"""
import uuid
from django.db import models
from apps.branches.site_config import SiteConfig  # noqa: F401 — re-export
from apps.branches.spin_log    import SpinLog      # noqa: F401 — re-export
from apps.core.fields import EncryptedCharField


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
    pickup_upi_only   = models.BooleanField(default=False, help_text="If true, pickup orders must pay via UPI only")
    upi_id            = EncryptedCharField(blank=True, default="", help_text="General UPI ID — encrypted at rest")
    gpay_upi_id       = EncryptedCharField(blank=True, default="", help_text="Google Pay UPI ID — encrypted at rest")
    phonepe_upi_id    = EncryptedCharField(blank=True, default="", help_text="PhonePe UPI ID — encrypted at rest")
    supermoney_upi_id = EncryptedCharField(blank=True, default="", help_text="SuperMoney UPI ID — encrypted at rest")
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


class BranchTable(models.Model):
    """A named, typed table or seating spot at a branch."""

    SEATING_TYPES = [
        ("indoor",   "Indoor"),
        ("outdoor",  "Outdoor"),
        ("window",   "Window Side"),
        ("counter",  "Counter / Bar"),
        ("private",  "Private Room"),
        ("family",   "Family Table"),
        ("booth",    "Booth"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch       = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="tables")
    table_number = models.PositiveSmallIntegerField(help_text="Internal number used in orders (e.g. 1, 2, 3)")
    label        = models.CharField(max_length=60, help_text="Display name shown to customer, e.g. 'Window Table A'")
    seating_type = models.CharField(max_length=12, choices=SEATING_TYPES, default="indoor")
    capacity     = models.PositiveSmallIntegerField(default=4, help_text="How many people this table seats")
    is_active    = models.BooleanField(default=True, help_text="Hidden from customers if False")

    class Meta:
        db_table        = "branch_tables"
        unique_together = [("branch", "table_number")]
        ordering        = ["branch", "table_number"]

    def __str__(self):
        return f"{self.branch.name} — Table {self.table_number} ({self.label})"