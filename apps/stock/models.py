"""
apps/stock/models.py

Stock tracking with daily carryover logic.

Models:
  StockRecord  — Per item, per branch, per day: today/used/remaining
  StockLog     — Full audit trail of every stock change
  StockAlert   — Triggered when item goes low or out

Celery task:
  midnight_carryover() — runs at 23:59 to roll remaining → next day
"""

import uuid
from django.db import models
from django.db.models import F
from django.conf import settings
from django.utils import timezone


class ChangeType(models.TextChoices):
    OPENING_SET       = "opening_set",       "Opening Stock Set"
    TOP_UP            = "top_up",            "Mid-Day Top-Up"
    AUTO_DEDUCTION    = "auto_deduction",    "Order Deduction"
    MANUAL_CORRECTION = "manual_correction", "Manual Correction"
    CARRYOVER         = "carryover",         "Nightly Carryover"
    ROLLBACK          = "rollback",          "Manual Rollback from Yesterday"
    WASTE             = "waste",             "Waste / Damage"
    LOCK              = "lock",              "Stock Locked for Day"


class StockRecord(models.Model):
    """
    One record per menu item per branch per day.
    Tracks the full daily stock lifecycle.

    Formula:
      today_stock     = yesterday_remaining + new_stock_added
      remaining_stock = today_stock - used_stock      (live)
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch              = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE, related_name="stock_records"
    )
    menu_item           = models.ForeignKey(
        "menu.MenuItem", on_delete=models.CASCADE, related_name="stock_records"
    )
    date                = models.DateField(default=timezone.localdate)

    # Carryover from yesterday (set by Celery at midnight)
    yesterday_remaining = models.IntegerField(default=0)

    # Added by admin/staff in the morning
    new_stock_added     = models.IntegerField(default=0)

    # today_stock = yesterday_remaining + new_stock_added (computed, stored for perf)
    today_stock         = models.IntegerField(default=0)

    # Auto-incremented as each order is placed
    used_stock          = models.IntegerField(default=0)

    # remaining_stock = today_stock - used_stock (computed property + stored)
    remaining_stock     = models.IntegerField(default=0)

    last_updated        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = "stock_records"
        unique_together = [("branch", "menu_item", "date")]
        ordering        = ["-date"]
        indexes         = [
            models.Index(fields=["branch", "date"]),
            models.Index(fields=["menu_item", "date"]),
        ]

    def __str__(self):
        return (
            f"{self.menu_item.name} | {self.date} | "
            f"Stock: {self.today_stock} | Used: {self.used_stock} | Left: {self.remaining_stock}"
        )

    def recompute(self):
        """Recompute today_stock and remaining_stock, then save."""
        self.today_stock    = self.yesterday_remaining + self.new_stock_added
        self.remaining_stock = self.today_stock - self.used_stock
        self.save(update_fields=["today_stock", "remaining_stock", "last_updated"])
        # Restore availability if item was previously sold out
        if not self.menu_item.is_available and self.remaining_stock > 0:
            self.menu_item.is_available = True
            self.menu_item.save(update_fields=["is_available"])

    def deduct(self, quantity: int):
        """
        Deduct stock atomically using F() expressions to prevent race conditions.
        Uses update() on the DB row directly — no read-modify-write cycle.
        Returns True if deduction succeeded, False if insufficient stock.
        """
        from django.db import transaction
        with transaction.atomic():
            # Re-read with select_for_update to lock the row
            fresh = StockRecord.objects.select_for_update().get(pk=self.pk)
            if fresh.remaining_stock < quantity:
                return False
            StockRecord.objects.filter(pk=self.pk).update(
                used_stock=F("used_stock") + quantity,
                remaining_stock=F("remaining_stock") - quantity,
                last_updated=timezone.now(),
            )
            # Refresh our instance
            self.refresh_from_db()

        # Auto-mark item unavailable if stock hits zero
        if self.remaining_stock <= 0:
            self.remaining_stock = max(0, self.remaining_stock)
            self.save(update_fields=["remaining_stock"])
            self.menu_item.is_available = False
            self.menu_item.save(update_fields=["is_available"])

        return True

    def add_stock(self, quantity: int, change_type=ChangeType.TOP_UP):
        """Add stock (top-up or opening set). Updates remaining.
        Also restores is_available=True if item was out-of-stock."""
        self.new_stock_added += quantity
        self.today_stock     += quantity
        self.remaining_stock += quantity
        self.save(update_fields=["new_stock_added", "today_stock", "remaining_stock", "last_updated"])

        # Re-mark as available if was out of stock
        if self.remaining_stock > 0 and not self.menu_item.is_available:
            self.menu_item.is_available = True
            self.menu_item.save(update_fields=["is_available"])

    @property
    def status(self):
        """Returns 'ok', 'low', 'critical', or 'out'."""
        threshold = self.menu_item.low_stock_threshold
        if self.remaining_stock == 0:
            return "out"
        if self.remaining_stock <= threshold * 0.25:
            return "critical"
        if self.remaining_stock <= threshold:
            return "low"
        return "ok"

    @property
    def status_color(self):
        return {
            "ok":       "#1D9E75",
            "low":      "#EF9F27",
            "critical": "#E24B4A",
            "out":      "#444441",
        }.get(self.status, "#888780")


class StockLog(models.Model):
    """
    Permanent audit trail. Every stock change creates a log entry.
    Who changed it, when, why, and how much.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch         = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE, related_name="stock_logs"
    )
    menu_item      = models.ForeignKey(
        "menu.MenuItem", on_delete=models.CASCADE, related_name="stock_logs"
    )
    stock_record   = models.ForeignKey(
        StockRecord, on_delete=models.SET_NULL,
        null=True, related_name="logs"
    )

    change_type    = models.CharField(max_length=25, choices=ChangeType.choices)
    qty_before     = models.IntegerField()
    qty_changed    = models.IntegerField()   # + for add, - for deduct
    qty_after      = models.IntegerField()

    # Who made the change (null for system/Celery)
    changed_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="stock_changes",
    )
    role_at_time   = models.CharField(max_length=20, blank=True)
    reason         = models.CharField(max_length=200, blank=True)

    # Order reference for auto-deductions
    order          = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )

    timestamp      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_logs"
        ordering = ["-timestamp"]
        indexes  = [
            models.Index(fields=["branch", "timestamp"]),
            models.Index(fields=["menu_item", "timestamp"]),
            models.Index(fields=["changed_by"]),
        ]

    def __str__(self):
        direction = "+" if self.qty_changed > 0 else ""
        return (
            f"{self.menu_item.name} | {self.change_type} | "
            f"{direction}{self.qty_changed} | {self.qty_before}→{self.qty_after}"
        )


class StockDailyLock(models.Model):
    """
    Locks stock edits for a branch on a specific date.
    Created manually by Admin/Staff or automatically by the midnight task.
    Stores end-of-day summary stats visible to SuperAdmin.
    """
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch        = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="stock_locks")
    date          = models.DateField()

    locked_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="stock_locks_created",
    )
    locked_at     = models.DateTimeField(auto_now_add=True)
    note          = models.CharField(max_length=200, blank=True)
    is_system     = models.BooleanField(default=False)  # True = created by midnight task

    # End-of-day summary (captured at lock time)
    total_added     = models.IntegerField(default=0)   # sum of new_stock_added across all items
    total_used      = models.IntegerField(default=0)   # sum of used_stock
    total_remaining = models.IntegerField(default=0)   # sum of remaining_stock (pending for tomorrow)
    rollback_count  = models.IntegerField(default=0)   # carryovers discarded today
    items_count     = models.IntegerField(default=0)   # total items tracked

    class Meta:
        db_table        = "stock_daily_locks"
        unique_together = [("branch", "date")]
        ordering        = ["-date"]
        indexes         = [models.Index(fields=["branch", "date"])]

    def __str__(self):
        who = self.locked_by.name if self.locked_by else "System"
        return f"Lock — {self.branch} — {self.date} — by {who}"


class StockAlert(models.Model):
    """
    Triggered automatically when stock crosses thresholds.
    Displayed as badges in staff and admin dashboards.
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch     = models.ForeignKey("branches.Branch", on_delete=models.CASCADE)
    menu_item  = models.ForeignKey("menu.MenuItem", on_delete=models.CASCADE)
    alert_type = models.CharField(
        max_length=10,
        choices=[("low", "Low Stock"), ("out", "Out of Stock")],
    )
    remaining  = models.IntegerField()
    is_seen    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_alerts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.alert_type.upper()} — {self.menu_item.name} ({self.remaining} left)"
