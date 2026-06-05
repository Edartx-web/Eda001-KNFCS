"""
apps/stock/tasks.py

Celery scheduled tasks for stock management.

Tasks:
  midnight_carryover()   — runs at 23:59 daily, rolls stock + flags orders
  check_stock_alerts()   — runs every 10 min, creates alerts for low/out items
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@shared_task(name="stock.midnight_carryover")
def midnight_carryover():
    """
    Runs at 23:59 every night via Celery Beat.

    For each branch:
      1. For every StockRecord today:
         → Create tomorrow's StockRecord with yesterday_remaining = today's remaining
         → Reset new_stock_added = 0, used_stock = 0 (admin adds in morning)

      2. For every pending Order (PLACED, CONFIRMED, PREPARING):
         → Flag as carried_over = True
         → Leave in queue for next morning

    Logs everything for audit.
    """
    from apps.stock.models import StockRecord, StockLog, ChangeType
    from apps.orders.models import Order, OrderStatus
    from apps.branches.models import Branch

    today    = timezone.localdate()
    tomorrow = today + timezone.timedelta(days=1)
    now      = timezone.now()

    logger.info(f"[midnight_carryover] Starting for date {today} → {tomorrow}")

    branches = Branch.objects.filter(is_active=True)
    total_stock_rolled = 0
    total_orders_flagged = 0

    for branch in branches:
        with transaction.atomic():
            # ── Stock rollover ─────────────────────────────────────────────
            today_records = StockRecord.objects.filter(
                branch=branch, date=today
            ).select_related("menu_item")

            for record in today_records:
                remaining = max(0, record.remaining_stock)

                # Skip carryover for items configured not to roll over
                if not record.menu_item.carries_over:
                    remaining = 0  # reset to 0, admin sets fresh stock in morning

                # Create tomorrow's record
                tomorrow_record, created = StockRecord.objects.get_or_create(
                    branch=branch,
                    menu_item=record.menu_item,
                    date=tomorrow,
                    defaults={
                        "yesterday_remaining": remaining,
                        "new_stock_added":     0,
                        "today_stock":         remaining,
                        "used_stock":          0,
                        "remaining_stock":     remaining,
                    }
                )

                if not created:
                    # Already exists — update yesterday_remaining only
                    tomorrow_record.yesterday_remaining = remaining
                    tomorrow_record.today_stock = remaining + tomorrow_record.new_stock_added
                    tomorrow_record.remaining_stock = tomorrow_record.today_stock - tomorrow_record.used_stock
                    tomorrow_record.save()

                # Log the carryover
                StockLog.objects.create(
                    branch=branch,
                    menu_item=record.menu_item,
                    stock_record=tomorrow_record,
                    change_type=ChangeType.CARRYOVER,
                    qty_before=record.remaining_stock,
                    qty_changed=0,
                    qty_after=remaining,
                    reason=f"Nightly carryover from {today} to {tomorrow}",
                )

                total_stock_rolled += 1

            # ── Order carryover ────────────────────────────────────────────
            pending_statuses = [
                OrderStatus.PLACED,
                OrderStatus.CONFIRMED,
                OrderStatus.PREPARING,
            ]
            pending_orders = Order.objects.filter(
                branch=branch,
                status__in=pending_statuses,
                created_at__date=today,
            )

            count = pending_orders.update(carried_over=True)
            total_orders_flagged += count

            if count > 0:
                logger.warning(
                    f"[midnight_carryover] Branch '{branch.name}': "
                    f"{count} orders carried over to {tomorrow}"
                )

    # ── Save end-of-day snapshots as system StockDailyLocks ──────────────
    # Captures pending stock for each branch before the rollover —
    # visible to SuperAdmin as historical daily summaries.
    from apps.stock.models import StockDailyLock, StockLog, ChangeType
    for branch in branches:
        # Skip if already manually locked by admin
        if StockDailyLock.objects.filter(branch=branch, date=today).exists():
            continue

        today_records = StockRecord.objects.filter(branch=branch, date=today)
        if not today_records.exists():
            continue

        rollback_count = StockLog.objects.filter(
            branch=branch,
            timestamp__date=today,
            change_type__in=[ChangeType.MANUAL_CORRECTION, ChangeType.ROLLBACK],
        ).count()

        StockDailyLock.objects.create(
            branch=branch,
            date=today,
            locked_by=None,
            is_system=True,
            note="Auto-snapshot at midnight before nightly rollover.",
            total_added=sum(r.new_stock_added  for r in today_records),
            total_used=sum(r.used_stock         for r in today_records),
            total_remaining=sum(r.remaining_stock for r in today_records),
            rollback_count=rollback_count,
            items_count=today_records.count(),
        )
        logger.info(
            f"[midnight_carryover] Snapshot saved for branch '{branch.name}' — {today}"
        )

    logger.info(
        f"[midnight_carryover] Done. "
        f"Stock records rolled: {total_stock_rolled}. "
        f"Orders flagged: {total_orders_flagged}."
    )
    return {
        "stock_rolled": total_stock_rolled,
        "orders_flagged": total_orders_flagged,
        "date": str(today),
    }


@shared_task(name="stock.check_stock_alerts")
def check_stock_alerts():
    """
    Runs every 10 minutes.
    Checks all today's stock records and creates/updates alerts
    for items that are low or out of stock.
    """
    from apps.stock.models import StockRecord, StockAlert

    today   = timezone.localdate()
    created = 0
    cleared = 0

    records = StockRecord.objects.filter(date=today).select_related("menu_item", "branch")

    for record in records:
        s = record.status

        if s in ("low", "critical", "out"):
            alert_type = "out" if s == "out" else "low"
            _, was_created = StockAlert.objects.get_or_create(
                branch=record.branch,
                menu_item=record.menu_item,
                alert_type=alert_type,
                defaults={"remaining": record.remaining_stock, "is_seen": False},
            )
            if was_created:
                created += 1
        else:
            # Stock recovered — clear unseen alerts
            deleted, _ = StockAlert.objects.filter(
                branch=record.branch,
                menu_item=record.menu_item,
                is_seen=False,
            ).delete()
            cleared += deleted

    logger.info(f"[check_alerts] Created: {created}, Cleared: {cleared}")
    return {"alerts_created": created, "alerts_cleared": cleared}
