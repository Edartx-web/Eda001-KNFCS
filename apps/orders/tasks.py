"""
apps/orders/tasks.py

Celery tasks for the orders app.
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(name="orders.auto_cancel_stale_orders")
def auto_cancel_stale_orders():
    """
    Auto-cancel two categories of stale orders:

    1. UPI orders with payment_status='pending' placed more than 5 minutes ago
       (customer did not pay within the allowed window).
    2. Any 'placed' order not confirmed by staff within 30 minutes.

    Runs every 5 minutes via Celery Beat.
    """
    from apps.orders.models import Order, OrderStatus

    upi_cutoff  = timezone.now() - timedelta(minutes=5)
    cash_cutoff = timezone.now() - timedelta(minutes=30)

    # 1. UPI payment timeout — 5 minutes
    upi_stale = Order.objects.filter(
        status=OrderStatus.PLACED,
        payment_method="upi",
        payment_status="pending",
        created_at__lt=upi_cutoff,
    )
    upi_count = upi_stale.count()
    if upi_count:
        upi_stale.update(
            status=OrderStatus.CANCELLED,
            cancel_reason="payment_timeout",
            cancel_note="Auto-cancelled: UPI payment not received within 5 minutes.",
        )
        logger.info("[auto_cancel] Cancelled %d UPI order(s) — payment timeout.", upi_count)

    # 2. General 30-minute stale orders (non-UPI, or UPI that somehow slipped through)
    cash_stale = Order.objects.filter(
        status=OrderStatus.PLACED,
        created_at__lt=cash_cutoff,
    ).exclude(
        payment_method="upi",
        payment_status="pending",
    )
    cash_count = cash_stale.count()
    if cash_count:
        cash_stale.update(
            status=OrderStatus.CANCELLED,
            cancel_reason="timeout",
            cancel_note="Auto-cancelled: not confirmed by staff within 30 minutes.",
        )
        logger.info("[auto_cancel] Cancelled %d order(s) older than 30 minutes.", cash_count)

    return {"cancelled_upi": upi_count, "cancelled_stale": cash_count}
