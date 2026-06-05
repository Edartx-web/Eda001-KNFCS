"""
apps/orders/models.py

Order system with daily token reset, full item tracking,
customisation capture, and placed_by audit.
"""

import uuid
from django.db import models
from django.conf import settings
from apps.core.fields import EncryptedCharField
from django.utils import timezone


class OrderType(models.TextChoices):
    DINE_IN = "dine_in", "Dine In"
    PICKUP  = "pickup",  "Pickup"


class OrderStatus(models.TextChoices):
    PLACED      = "placed",      "Placed"
    CONFIRMED   = "confirmed",   "Confirmed"
    PREPARING   = "preparing",   "Preparing"
    READY       = "ready",       "Ready"
    COMPLETED   = "completed",   "Completed"
    CANCELLED   = "cancelled",   "Cancelled"


class PlacedBy(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    STAFF    = "staff",    "Staff"


# ─── Token generation ─────────────────────────────────────────────────────────

def generate_token(branch_id):
    """
    Generate next sequential daily token for a branch.
    Resets to T001 at midnight.
    Format: T001, T002, ... T999
    """
    today = timezone.localdate()
    last  = Order.objects.filter(
        branch_id=branch_id,
        created_at__date=today,
    ).order_by("-token_number").first()

    if last and last.token_number:
        try:
            n = int(last.token_number.replace("T", "")) + 1
        except ValueError:
            n = 1
    else:
        n = 1

    return f"T{n:03d}"   # T001, T002 ... T999


# ─── Order ────────────────────────────────────────────────────────────────────

class Order(models.Model):
    """
    A customer order. Token resets daily per branch.
    Tracks who placed it (customer self or staff-assisted).
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch       = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    customer     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        null=True, blank=True,    # Null for walk-in without account
    )

    # Token — daily sequential per branch
    token_number = models.CharField(max_length=10, blank=True)

    # Order type
    order_type   = models.CharField(max_length=10, choices=OrderType.choices)
    table_number = models.PositiveSmallIntegerField(null=True, blank=True)

    # Cancellation
    cancel_reason = models.CharField(
        max_length=30, blank=True, default="",
        help_text="Predefined reason code for cancellation"
    )
    cancel_note   = models.TextField(
        blank=True, default="",
        help_text="Optional free-text note from staff when cancelling"
    )

    # Status
    status       = models.CharField(
        max_length=15,
        choices=OrderStatus.choices,
        default=OrderStatus.PLACED,
    )

    # Who placed it
    placed_by    = models.CharField(
        max_length=10,
        choices=PlacedBy.choices,
        default=PlacedBy.CUSTOMER,
    )
    placed_by_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="staff_placed_orders",
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="staff_completed_orders",
        help_text="Staff/BranchAdmin who marked this order completed",
    )

    # Walk-in customer details (if no account)
    walkin_name  = models.CharField(max_length=100, blank=True)
    walkin_phone = models.CharField(max_length=20, blank=True)

    # Financials
    subtotal     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total        = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Payment
    payment_method = models.CharField(
        max_length=10,
        choices=[("cash","Cash"),("upi","UPI"),("card","Card")],
        default="cash",
    )
    payment_status = models.CharField(
        max_length=10,
        choices=[("pending","Pending"),("paid","Paid"),("waived","Waived")],
        default="pending",
    )
    upi_ref        = EncryptedCharField(blank=True, default="")  # transaction ref — encrypted at rest
    payment_serial = models.CharField(max_length=20, blank=True, default="")  # staff-assigned e.g. PAY001
    payment_marked_by = models.ForeignKey(
        "accounts.User",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="payments_marked",
    )

    # Applied offer
    offer        = models.ForeignKey(
        "offers.DailyOffer",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders",
    )

    # Loyalty points earned
    points_earned = models.PositiveIntegerField(default=0)

    # Carryover flag — set by midnight Celery task
    carried_over = models.BooleanField(default=False)

    # Special instructions at order level
    special_instructions = models.TextField(blank=True)

    # Timestamps
    created_at   = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    ready_at     = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["branch", "created_at"]),
            models.Index(fields=["customer"]),
            models.Index(fields=["token_number"]),
        ]

    def __str__(self):
        return f"{self.token_number} — {self.branch.name} — {self.status}"

    def save(self, *args, **kwargs):
        # Auto-generate token on first save
        if not self.token_number:
            self.token_number = generate_token(self.branch_id)
        super().save(*args, **kwargs)

    def update_status(self, new_status):
        """Update status and set relevant timestamps."""
        self.status = new_status
        now = timezone.now()
        if new_status == OrderStatus.CONFIRMED:
            self.confirmed_at = now
        elif new_status == OrderStatus.READY:
            self.ready_at = now
        elif new_status == OrderStatus.COMPLETED:
            self.completed_at = now
        self.save(update_fields=["status", "confirmed_at", "ready_at", "completed_at"])

    @property
    def status_display_label(self):
        labels = {
            OrderStatus.PLACED:    "Order placed",
            OrderStatus.CONFIRMED: "Confirmed",
            OrderStatus.PREPARING: "Being prepared",
            OrderStatus.READY:     "Ready to collect!",
            OrderStatus.COMPLETED: "Completed",
            OrderStatus.CANCELLED: "Cancelled",
        }
        return labels.get(self.status, self.status)

    @property
    def status_emoji(self):
        emojis = {
            OrderStatus.PLACED:    "🛒",
            OrderStatus.CONFIRMED: "✅",
            OrderStatus.PREPARING: "🍳",
            OrderStatus.READY:     "🔔",
            OrderStatus.COMPLETED: "🏁",
            OrderStatus.CANCELLED: "❌",
        }
        return emojis.get(self.status, "📦")

    @property
    def customer_display_name(self):
        if self.customer:
            return self.customer.name
        return self.walkin_name or "Walk-in Customer"

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


# ─── Order Item ───────────────────────────────────────────────────────────────

class OrderItem(models.Model):
    """
    One line in an order. Captures price at time of order
    so historical records remain accurate even if menu prices change.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order        = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item    = models.ForeignKey(
        "menu.MenuItem",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    name_snapshot  = models.CharField(max_length=150)  # Capture name at time of order
    price_snapshot = models.DecimalField(max_digits=8, decimal_places=2)  # Price at order time

    quantity     = models.PositiveSmallIntegerField(default=1)
    line_total   = models.DecimalField(max_digits=10, decimal_places=2)

    # Customisation choices made by customer
    customisations = models.JSONField(
        default=list,
        help_text='[{"name": "Extra Spicy", "extra_price": "0.00"}]'
    )

    # Item-level special instructions
    special_instructions = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "order_items"

    def __str__(self):
        return f"{self.order.token_number} — {self.name_snapshot} × {self.quantity}"

    def save(self, *args, **kwargs):
        # Auto-capture name and calculate line total
        if not self.name_snapshot:
            self.name_snapshot = self.menu_item.name
        if not self.price_snapshot:
            self.price_snapshot = self.menu_item.price

        # Add customisation extra prices
        extra = sum(
            float(c.get("extra_price", 0))
            for c in (self.customisations or [])
        )
        self.line_total = (float(self.price_snapshot) + extra) * self.quantity
        super().save(*args, **kwargs)
