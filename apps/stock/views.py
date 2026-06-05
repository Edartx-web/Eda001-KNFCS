"""apps/stock/views.py"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.stock.models import StockRecord, StockLog, StockAlert, ChangeType
from apps.accounts.permissions import IsStaffOrAbove, IsAdminOrAbove, get_request_branch_id


def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


class StockDashboardView(APIView):
    """
    GET /api/v1/stock/
    Returns today's stock snapshot for all items in the branch.
    Staff, Branch Admin, Super Admin.
    """
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()

        # Today's stock records indexed by menu_item_id
        records = StockRecord.objects.filter(
            branch_id=branch_id, date=today,
        ).select_related("menu_item")
        record_map = {str(r.menu_item_id): r for r in records}

        # All menu items for this branch (so items without records show as 0 stock)
        from apps.menu.models import MenuItem
        items = MenuItem.objects.filter(
            branch_id=branch_id,
        ).select_related("category").order_by(
            "category__display_order", "display_order"
        )

        data = []
        for item in items:
            r = record_map.get(str(item.id))
            # Prefer thumbnail; fallback to full image; fallback to None
            _img = item.image_thumb or item.image
            _image_url = request.build_absolute_uri(_img.url) if _img else None
            data.append({
                "menu_item_id":       str(item.id),
                "menu_item_name":     item.name,
                "emoji":              item.emoji,
                "image_url":          _image_url,
                "category":           item.category.name,
                "yesterday_remaining": r.yesterday_remaining if r else 0,
                "new_stock_added":    r.new_stock_added    if r else 0,
                "today_stock":        r.today_stock        if r else 0,
                "used_stock":         r.used_stock         if r else 0,
                "remaining_stock":    r.remaining_stock    if r else 0,
                "status":             r.status             if r else "out",
                "status_color":       r.status_color       if r else "#E24B4A",
                "threshold":          item.low_stock_threshold,
                "carries_over":       item.carries_over,
                "has_record":         r is not None,
            })

        alerts = StockAlert.objects.filter(
            branch_id=branch_id, is_seen=False
        ).count()

        from apps.stock.models import StockDailyLock
        lock = StockDailyLock.objects.filter(branch_id=branch_id, date=today).first()

        return ok({
            "stock":         data,
            "date":          str(today),
            "alert_count":   alerts,
            "out_of_stock":  sum(1 for d in data if d["status"] == "out"),
            "low_stock":     sum(1 for d in data if d["status"] in ("low", "critical")),
            "is_locked":     lock is not None,
            "lock_info":     {
                "locked_by": lock.locked_by.name if lock and lock.locked_by else "System",
                "locked_at": lock.locked_at.isoformat() if lock else None,
                "note":      lock.note if lock else "",
            } if lock else None,
        })


class StockTopUpView(APIView):
    """
    POST /api/v1/stock/topup/
    Staff, Branch Admin, Super Admin can add stock mid-day.
    Creates full audit log entry.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        # SuperAdmin can pass branch_id explicitly in body
        branch_id = (
            request.data.get("branch_id")
            or get_request_branch_id(request)
        )
        menu_item_id = request.data.get("menu_item_id")
        quantity    = int(request.data.get("quantity", 0))
        reason      = request.data.get("reason", "")

        if not menu_item_id or quantity <= 0:
            return err("menu_item_id and a positive quantity are required.")

        today = timezone.localdate()

        from apps.stock.models import StockDailyLock
        if StockDailyLock.objects.filter(branch_id=branch_id, date=today).exists():
            return err("Today's stock is locked. Contact the Branch Admin to unlock.")

        try:
            record = StockRecord.objects.get(
                branch_id=branch_id,
                menu_item_id=menu_item_id,
                date=today,
            )
        except StockRecord.DoesNotExist:
            # Create record if it doesn't exist yet today
            from apps.menu.models import MenuItem
            import datetime
            try:
                item = MenuItem.objects.get(id=menu_item_id, branch_id=branch_id)
            except MenuItem.DoesNotExist:
                return err("Menu item not found.")

            # Backfill carryover from yesterday (Celery fallback)
            yesterday_remaining = 0
            if item.carries_over:
                yesterday = today - datetime.timedelta(days=1)
                try:
                    prev = StockRecord.objects.get(
                        branch_id=branch_id, menu_item=item, date=yesterday
                    )
                    yesterday_remaining = prev.remaining_stock
                except StockRecord.DoesNotExist:
                    pass

            record = StockRecord.objects.create(
                branch_id=branch_id,
                menu_item=item,
                date=today,
                yesterday_remaining=yesterday_remaining,
                today_stock=yesterday_remaining,
                remaining_stock=yesterday_remaining,
            )

        qty_before = record.remaining_stock

        # Determine change type based on user role
        change_type = (
            ChangeType.OPENING_SET
            if request.data.get("is_opening")
            else ChangeType.TOP_UP
        )

        record.add_stock(quantity, change_type=change_type)

        # Write audit log
        StockLog.objects.create(
            branch_id=branch_id,
            menu_item_id=menu_item_id,
            stock_record=record,
            change_type=change_type,
            qty_before=qty_before,
            qty_changed=quantity,
            qty_after=record.remaining_stock,
            changed_by=request.user,
            role_at_time=request.user.role,
            reason=reason or f"Top-up by {request.user.name}",
        )

        return ok({
            "message":        f"Added {quantity} units successfully.",
            "remaining_stock": record.remaining_stock,
            "today_stock":    record.today_stock,
        })


class StockLogView(APIView):
    """
    GET /api/v1/stock/log/
    Staff sees own entries. Admin sees all. Filtered by date/item.
    """
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        branch_id = get_request_branch_id(request)
        qs = StockLog.objects.filter(branch_id=branch_id).select_related(
            "menu_item", "changed_by"
        ).order_by("-timestamp")

        # Staff see only today's logs
        from apps.accounts.models import Role
        if request.user.role == Role.STAFF:
            qs = qs.filter(timestamp__date=timezone.localdate())

        # Filters
        item_id = request.query_params.get("menu_item_id")
        if item_id:
            qs = qs.filter(menu_item_id=item_id)

        date = request.query_params.get("date")
        if date:
            qs = qs.filter(timestamp__date=date)

        data = [{
            "id":            str(log.id),
            "item":          log.menu_item.name,
            "change_type":   log.change_type,
            "qty_before":    log.qty_before,
            "qty_changed":   log.qty_changed,
            "qty_after":     log.qty_after,
            "changed_by":    log.changed_by.name if log.changed_by else "System",
            "role":          log.role_at_time,
            "reason":        log.reason,
            "timestamp":     log.timestamp.isoformat(),
        } for log in qs[:50]]

        return ok({"logs": data})


class AcknowledgeAlertsView(APIView):
    """PATCH /api/v1/stock/alerts/ack/ — mark alerts as seen."""
    permission_classes = [IsStaffOrAbove]

    def patch(self, request):
        branch_id = get_request_branch_id(request)
        StockAlert.objects.filter(branch_id=branch_id, is_seen=False).update(is_seen=True)
        return ok({"message": "Alerts acknowledged."})


class StockThresholdView(APIView):
    """
    PATCH /api/v1/stock/threshold/
    { menu_item_id: UUID, low_stock_threshold: int }

    Update the low-stock alert threshold for a specific item.
    Branch Admin or above.
    """
    permission_classes = [IsAdminOrAbove]

    def patch(self, request):
        from apps.menu.models import MenuItem
        item_id   = request.data.get("menu_item_id")
        threshold = request.data.get("low_stock_threshold")

        if not item_id or threshold is None:
            return err("menu_item_id and low_stock_threshold are required.")

        try:
            threshold = int(threshold)
            if threshold < 1:
                raise ValueError
        except (TypeError, ValueError):
            return err("low_stock_threshold must be a positive integer.")

        try:
            item = MenuItem.objects.get(id=item_id)
        except MenuItem.DoesNotExist:
            return err("Menu item not found.", 404)

        item.low_stock_threshold = threshold
        item.save(update_fields=["low_stock_threshold"])

        return ok({
            "menu_item_id":       str(item.id),
            "menu_item_name":     item.name,
            "low_stock_threshold": item.low_stock_threshold,
            "message": "Threshold updated.",
        })


class StockCarryoverToggleView(APIView):
    """
    PATCH /api/v1/stock/carryover/
    { menu_item_id: UUID, carries_over: bool }

    Toggle whether a menu item's remaining stock rolls over to the next day.
    When carries_over=False, the midnight task resets stock to 0.
    Branch Admin or above.
    """
    permission_classes = [IsAdminOrAbove]

    def patch(self, request):
        from apps.menu.models import MenuItem
        item_id      = request.data.get("menu_item_id")
        carries_over = request.data.get("carries_over")

        if not item_id or carries_over is None:
            return err("menu_item_id and carries_over are required.")

        try:
            item = MenuItem.objects.get(id=item_id)
        except MenuItem.DoesNotExist:
            return err("Menu item not found.", 404)

        item.carries_over = bool(carries_over)
        item.save(update_fields=["carries_over"])

        return ok({
            "menu_item_id":  str(item.id),
            "menu_item_name": item.name,
            "carries_over":  item.carries_over,
            "message": "Carryover setting updated.",
        })


class StockHistoryView(APIView):
    """
    GET /api/v1/stock/history/
    ?branch_id=&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Returns StockRecord rows with opening/added/total/used/remaining for the date range.
    Branch Admin (own branch) or Super Admin (any branch via branch_id param).
    """
    permission_classes = [IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        from apps.stock.models import StockRecord as SR
        from apps.accounts.permissions import get_request_branch_id
        import datetime

        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")

        if not branch_id:
            return err("branch_id required.")

        qs = SR.objects.filter(branch_id=branch_id).select_related("menu_item").order_by("-date", "menu_item__name")

        if date_from:
            try: qs = qs.filter(date__gte=datetime.date.fromisoformat(date_from))
            except ValueError: pass
        if date_to:
            try: qs = qs.filter(date__lte=datetime.date.fromisoformat(date_to))
            except ValueError: pass

        records = []
        for r in qs[:500]:
            records.append({
                "id":              str(r.id),
                "menu_item_name":  r.menu_item.name,
                "date":            r.date.isoformat(),
                "opening_stock":   r.yesterday_remaining,
                "new_stock_added": r.new_stock_added,
                "today_stock":     r.today_stock,
                "used_stock":      r.used_stock,
                "remaining_stock": r.remaining_stock,
                "status":          r.status,
            })

        return Response({"success": True, "records": records, "count": len(records)})


class StockRollbackView(APIView):
    """
    POST /api/v1/stock/rollback/
    { menu_item_id: UUID, branch_id?: UUID }

    Manually pull yesterday's remaining stock into today's record.
    Used when the midnight Celery task didn't run, or when carries_over=False
    but the admin wants to bring yesterday's stock back for this item today.
    Staff or above.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        import datetime
        branch_id    = request.data.get("branch_id") or get_request_branch_id(request)
        menu_item_id = request.data.get("menu_item_id")

        if not menu_item_id:
            return err("menu_item_id is required.")

        today     = timezone.localdate()
        yesterday = today - datetime.timedelta(days=1)

        # Get yesterday's record
        try:
            yesterday_rec = StockRecord.objects.get(
                branch_id=branch_id, menu_item_id=menu_item_id, date=yesterday
            )
        except StockRecord.DoesNotExist:
            return err("No stock record found for yesterday.")

        if yesterday_rec.remaining_stock <= 0:
            return err("Yesterday had no remaining stock to roll back.")

        carry = yesterday_rec.remaining_stock

        # Get or create today's record
        from apps.menu.models import MenuItem
        try:
            item = MenuItem.objects.get(id=menu_item_id)
        except MenuItem.DoesNotExist:
            return err("Menu item not found.", 404)

        record, created = StockRecord.objects.get_or_create(
            branch_id=branch_id, menu_item_id=menu_item_id, date=today,
            defaults={
                "yesterday_remaining": carry,
                "new_stock_added":     0,
                "today_stock":         carry,
                "used_stock":          0,
                "remaining_stock":     carry,
            }
        )

        qty_before = record.remaining_stock

        if not created:
            if record.yesterday_remaining == carry:
                return err("Yesterday's stock is already rolled into today.")
            record.yesterday_remaining = carry
            record.recompute()

        StockLog.objects.create(
            branch_id=branch_id,
            menu_item_id=menu_item_id,
            stock_record=record,
            change_type=ChangeType.ROLLBACK,
            qty_before=qty_before,
            qty_changed=carry,
            qty_after=record.remaining_stock,
            changed_by=request.user,
            role_at_time=request.user.role,
            reason=f"Manual rollback of {carry} units from {yesterday} by {request.user.name}",
        )

        return ok({
            "message":         f"Rolled back {carry} units from {yesterday}.",
            "today_stock":     record.today_stock,
            "remaining_stock": record.remaining_stock,
        })


class StockLockView(APIView):
    """
    GET  /api/v1/stock/lock/   — Check if today's stock is locked for the branch.
    POST /api/v1/stock/lock/   — Lock today's stock (Admin or above).
    DELETE /api/v1/stock/lock/ — Unlock today's stock (SuperAdmin only).
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.stock.models import StockDailyLock
        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()
        try:
            lock = StockDailyLock.objects.select_related("locked_by").get(
                branch_id=branch_id, date=today
            )
            return ok({
                "locked":       True,
                "locked_by":    lock.locked_by.name if lock.locked_by else "System",
                "locked_at":    lock.locked_at.isoformat(),
                "note":         lock.note,
                "is_system":    lock.is_system,
                "total_added":     lock.total_added,
                "total_used":      lock.total_used,
                "total_remaining": lock.total_remaining,
                "rollback_count":  lock.rollback_count,
                "items_count":     lock.items_count,
            })
        except StockDailyLock.DoesNotExist:
            return ok({"locked": False})

    def post(self, request):
        from apps.stock.models import StockDailyLock
        from apps.accounts.models import Role
        if request.user.role == Role.STAFF:
            return err("Only Branch Admin or Super Admin can lock stock.", 403)

        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()
        note      = request.data.get("note", "")

        if StockDailyLock.objects.filter(branch_id=branch_id, date=today).exists():
            return err("Today's stock is already locked.")

        # Compute summary stats
        records = StockRecord.objects.filter(branch_id=branch_id, date=today)
        total_added     = sum(r.new_stock_added  for r in records)
        total_used      = sum(r.used_stock        for r in records)
        total_remaining = sum(r.remaining_stock   for r in records)
        rollback_count  = StockLog.objects.filter(
            branch_id=branch_id,
            timestamp__date=today,
            change_type__in=[ChangeType.MANUAL_CORRECTION, ChangeType.ROLLBACK],
            reason__icontains="carryover",
        ).count()

        lock = StockDailyLock.objects.create(
            branch_id=branch_id,
            date=today,
            locked_by=request.user,
            note=note,
            is_system=False,
            total_added=total_added,
            total_used=total_used,
            total_remaining=total_remaining,
            rollback_count=rollback_count,
            items_count=records.count(),
        )

        # Log one entry per item for the lock event
        for r in records:
            StockLog.objects.create(
                branch_id=branch_id,
                menu_item_id=r.menu_item_id,
                stock_record=r,
                change_type=ChangeType.LOCK,
                qty_before=r.remaining_stock,
                qty_changed=0,
                qty_after=r.remaining_stock,
                changed_by=request.user,
                role_at_time=request.user.role,
                reason=f"Stock locked by {request.user.name}" + (f": {note}" if note else ""),
            )

        return ok({
            "message":         "Today's stock has been locked.",
            "locked_at":       lock.locked_at.isoformat(),
            "total_remaining": total_remaining,
        })

    def delete(self, request):
        from apps.stock.models import StockDailyLock
        from apps.accounts.models import Role
        if request.user.role != Role.SUPER_ADMIN:
            return err("Only Super Admin can unlock stock.", 403)

        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()

        deleted, _ = StockDailyLock.objects.filter(branch_id=branch_id, date=today).delete()
        if not deleted:
            return err("No lock found for today.")

        return ok({"message": "Today's stock has been unlocked."})


class StockActivityView(APIView):
    """
    GET /api/v1/stock/activity/
    ?branch_id=&date=YYYY-MM-DD

    Returns daily stock activity summary for SuperAdmin:
      - Per-day lock info (who locked, when)
      - Total added / used / remaining for the day
      - Rollback count
      - List of individual StockLog entries for the day
    Accessible by Branch Admin (own branch) or Super Admin (any branch).
    """
    permission_classes = [IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        import datetime
        from apps.stock.models import StockDailyLock
        from apps.accounts.models import Role

        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        date_str  = request.query_params.get("date", str(timezone.localdate()))

        try:
            query_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return err("Invalid date format. Use YYYY-MM-DD.")

        if not branch_id:
            return err("branch_id required.")

        # Lock info
        lock_data = None
        try:
            lock = StockDailyLock.objects.select_related("locked_by").get(
                branch_id=branch_id, date=query_date
            )
            lock_data = {
                "locked":          True,
                "locked_by":       lock.locked_by.name if lock.locked_by else "System",
                "locked_by_role":  lock.locked_by.role if lock.locked_by else "",
                "locked_at":       lock.locked_at.isoformat(),
                "note":            lock.note,
                "is_system":       lock.is_system,
                "total_added":     lock.total_added,
                "total_used":      lock.total_used,
                "total_remaining": lock.total_remaining,
                "rollback_count":  lock.rollback_count,
                "items_count":     lock.items_count,
            }
        except StockDailyLock.DoesNotExist:
            # Compute live stats from records if no lock
            records = StockRecord.objects.filter(branch_id=branch_id, date=query_date)
            lock_data = {
                "locked":          False,
                "total_added":     sum(r.new_stock_added  for r in records),
                "total_used":      sum(r.used_stock        for r in records),
                "total_remaining": sum(r.remaining_stock   for r in records),
                "items_count":     records.count(),
            }

        # Stock logs for the day (all types)
        logs = StockLog.objects.filter(
            branch_id=branch_id,
            timestamp__date=query_date,
        ).select_related("menu_item", "changed_by").exclude(
            change_type=ChangeType.AUTO_DEDUCTION  # exclude order deductions for clarity
        ).order_by("timestamp")

        rollback_count = 0
        log_entries = []
        for log in logs:
            if log.change_type in (ChangeType.MANUAL_CORRECTION, ChangeType.ROLLBACK):
                rollback_count += 1
            log_entries.append({
                "id":          str(log.id),
                "item":        log.menu_item.name if log.menu_item else "—",
                "change_type": log.change_type,
                "qty_before":  log.qty_before,
                "qty_changed": log.qty_changed,
                "qty_after":   log.qty_after,
                "changed_by":  log.changed_by.name if log.changed_by else "System",
                "role":        log.role_at_time,
                "reason":      log.reason,
                "timestamp":   log.timestamp.isoformat(),
            })

        # Per-item snapshot for the day
        item_records = StockRecord.objects.filter(
            branch_id=branch_id, date=query_date
        ).select_related("menu_item").order_by("menu_item__name")

        items = [{
            "menu_item_id":      str(r.menu_item_id),
            "name":              r.menu_item.name,
            "yesterday_remaining": r.yesterday_remaining,
            "new_stock_added":   r.new_stock_added,
            "today_stock":       r.today_stock,
            "used_stock":        r.used_stock,
            "remaining_stock":   r.remaining_stock,
            "status":            r.status,
        } for r in item_records]

        return ok({
            "date":            date_str,
            "summary":         lock_data,
            "rollback_count":  rollback_count,
            "logs":            log_entries,
            "items":           items,
        })


class StockRejectCarryoverView(APIView):
    """
    POST /api/v1/stock/reject-carryover/
    { menu_item_id: UUID, branch_id?: UUID }

    Discard yesterday's carryover from today's record.
    Sets yesterday_remaining=0, recomputes today_stock/remaining_stock, writes audit log.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        branch_id = (
            request.data.get("branch_id")
            or get_request_branch_id(request)
        )
        menu_item_id = request.data.get("menu_item_id")

        if not menu_item_id:
            return err("menu_item_id is required.")

        today = timezone.localdate()

        from apps.stock.models import StockDailyLock
        if StockDailyLock.objects.filter(branch_id=branch_id, date=today).exists():
            return err("Today's stock is locked. Contact the Branch Admin to unlock.")

        try:
            record = StockRecord.objects.select_related("menu_item").get(
                branch_id=branch_id,
                menu_item_id=menu_item_id,
                date=today,
            )
        except StockRecord.DoesNotExist:
            return err("No stock record found for today. Please set opening stock first.")

        if record.yesterday_remaining == 0:
            return ok({
                "message":         "No carryover to reject.",
                "today_stock":     record.today_stock,
                "remaining_stock": record.remaining_stock,
            })

        discarded  = record.yesterday_remaining
        qty_before = record.remaining_stock

        # Clear carryover and recompute
        record.yesterday_remaining = 0
        record.save(update_fields=["yesterday_remaining"])
        record.recompute()

        # Clamp remaining to 0 (safety: if used_stock > new_stock_added)
        if record.remaining_stock < 0:
            record.remaining_stock = 0
            record.save(update_fields=["remaining_stock"])

        StockLog.objects.create(
            branch_id=branch_id,
            menu_item_id=menu_item_id,
            stock_record=record,
            change_type=ChangeType.MANUAL_CORRECTION,
            qty_before=qty_before,
            qty_changed=-discarded,
            qty_after=record.remaining_stock,
            changed_by=request.user,
            role_at_time=request.user.role,
            reason=f"Carryover rejected by {request.user.name}",
        )

        return ok({
            "message":         f"Discarded {discarded} units of carryover.",
            "today_stock":     record.today_stock,
            "remaining_stock": record.remaining_stock,
        })


class StockBulkCarryoverView(APIView):
    """
    POST /api/v1/stock/bulk-carryover/
    { action: "keep" | "discard", branch_id?: UUID }

    One-shot morning confirmation: either roll all of yesterday's remaining
    stock into today for every item (action="keep"), or discard all carryover
    for items that have it (action="discard").

    Admin or above only.  Idempotent — safe to call multiple times.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        import datetime
        branch_id = request.data.get("branch_id") or get_request_branch_id(request)
        action    = request.data.get("action", "keep")  # "keep" | "discard"

        if action not in ("keep", "discard"):
            return err("action must be 'keep' or 'discard'.")

        today     = timezone.localdate()
        yesterday = today - datetime.timedelta(days=1)

        from apps.menu.models import MenuItem
        items = MenuItem.objects.filter(branch_id=branch_id, is_available=True)

        kept = discarded = skipped = 0

        for item in items:
            # Get yesterday's record
            try:
                prev = StockRecord.objects.get(branch_id=branch_id, menu_item=item, date=yesterday)
                carry = prev.remaining_stock
            except StockRecord.DoesNotExist:
                carry = 0

            if carry <= 0:
                skipped += 1
                continue

            if action == "keep":
                record, created = StockRecord.objects.get_or_create(
                    branch_id=branch_id, menu_item=item, date=today,
                    defaults={
                        "yesterday_remaining": carry,
                        "new_stock_added":     0,
                        "today_stock":         carry,
                        "used_stock":          0,
                        "remaining_stock":     carry,
                    },
                )
                if not created:
                    if record.yesterday_remaining == carry:
                        skipped += 1
                        continue
                    qty_before = record.remaining_stock
                    record.yesterday_remaining = carry
                    record.recompute()
                else:
                    qty_before = 0

                StockLog.objects.create(
                    branch_id=branch_id, menu_item=item,
                    stock_record=record,
                    change_type=ChangeType.ROLLBACK,
                    qty_before=qty_before, qty_changed=carry,
                    qty_after=record.remaining_stock,
                    changed_by=request.user, role_at_time=request.user.role,
                    reason=f"Bulk rollback of yesterday stock by {request.user.name}",
                )
                kept += 1

            else:  # discard
                try:
                    record = StockRecord.objects.get(branch_id=branch_id, menu_item=item, date=today)
                except StockRecord.DoesNotExist:
                    skipped += 1
                    continue
                if record.yesterday_remaining == 0:
                    skipped += 1
                    continue
                qty_before = record.remaining_stock
                discarded_qty = record.yesterday_remaining
                record.yesterday_remaining = 0
                record.recompute()
                if record.remaining_stock < 0:
                    record.remaining_stock = 0
                    record.save(update_fields=["remaining_stock"])

                StockLog.objects.create(
                    branch_id=branch_id, menu_item=item,
                    stock_record=record,
                    change_type=ChangeType.MANUAL_CORRECTION,
                    qty_before=qty_before, qty_changed=-discarded_qty,
                    qty_after=record.remaining_stock,
                    changed_by=request.user, role_at_time=request.user.role,
                    reason=f"Bulk carryover discarded by {request.user.name}",
                )
                discarded += 1

        verb = "rolled back" if action == "keep" else "discarded"
        return ok({
            "message": f"{verb.capitalize()} yesterday's stock for {kept + discarded} item(s). {skipped} had no carryover.",
            "kept": kept, "discarded": discarded, "skipped": skipped,
        })


class StockFullResetView(APIView):
    """
    POST /api/v1/stock/reset/
    {
        branch_id?: UUID,
        reason:     str   (required for branch_admin, optional for super_admin)
    }

    Resets ALL of today's stock records for the branch to zero.
    Creates an audit log entry per item.

    SuperAdmin  — no reason required.
    BranchAdmin — reason is required (recorded in audit log + notification).
    Staff       — not allowed.
    """
    permission_classes = [IsAdminOrAbove]

    def post(self, request):
        from apps.accounts.models import Role
        branch_id = request.data.get("branch_id") or get_request_branch_id(request)
        reason    = (request.data.get("reason") or "").strip()
        user      = request.user
        is_super  = user.role == Role.SUPER_ADMIN

        if not is_super and not reason:
            return err("A reason is required to reset stock as Branch Admin.")

        today = timezone.localdate()

        from apps.stock.models import StockDailyLock
        if StockDailyLock.objects.filter(branch_id=branch_id, date=today).exists():
            return err("Today's stock is locked. Unlock it before resetting.")

        records = StockRecord.objects.filter(branch_id=branch_id, date=today)
        reset_count = 0

        for record in records:
            if record.remaining_stock == 0 and record.today_stock == 0:
                continue  # already zero

            qty_before = record.remaining_stock

            record.yesterday_remaining = 0
            record.new_stock_added     = 0
            record.today_stock         = 0
            record.used_stock          = 0
            record.remaining_stock     = 0
            record.save(update_fields=[
                "yesterday_remaining", "new_stock_added",
                "today_stock", "used_stock", "remaining_stock",
            ])

            log_reason = (
                f"Full stock reset by SuperAdmin {user.name}"
                if is_super
                else f"Full stock reset by BranchAdmin {user.name} — Reason: {reason}"
            )

            StockLog.objects.create(
                branch_id=branch_id,
                menu_item=record.menu_item,
                stock_record=record,
                change_type=ChangeType.MANUAL_CORRECTION,
                qty_before=qty_before,
                qty_changed=-qty_before,
                qty_after=0,
                changed_by=user,
                role_at_time=user.role,
                reason=log_reason,
            )
            reset_count += 1

        return ok({
            "message":     f"Reset {reset_count} stock record(s) to zero.",
            "reset_count": reset_count,
            "reason":      reason,
            "reset_by":    user.name,
            "is_super":    is_super,
        })


class SuperAdminActivityLogView(APIView):
    """
    GET /api/v1/stock/admin-log/
    SuperAdmin only. Returns recent stock actions performed by
    BranchAdmins across all branches (stock updates, locks, resets, carryovers).

    Query params:
      ?branch_id=<uuid>  — filter to one branch
      ?date=YYYY-MM-DD   — filter to one day (default: today)
      ?role=branch_admin|staff|all  — filter by actor role (default: branch_admin)
      ?limit=N           — max results (default 100)
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        import datetime
        from apps.accounts.models import Role
        from apps.stock.models import StockDailyLock

        # Only SuperAdmin can call this without branch restriction
        if request.user.role not in (Role.SUPER_ADMIN, Role.BRANCH_ADMIN):
            return err("Access denied.", 403)

        branch_id = request.query_params.get("branch_id")
        date_str  = request.query_params.get("date", str(timezone.localdate()))
        role_filter = request.query_params.get("role", "branch_admin")
        limit     = min(int(request.query_params.get("limit", 100)), 500)

        # BranchAdmin can only see their own branch
        if request.user.role == Role.BRANCH_ADMIN:
            branch_id = str(request.user.branch_id)

        try:
            query_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return err("Invalid date format. Use YYYY-MM-DD.")

        qs = StockLog.objects.select_related(
            "menu_item", "changed_by", "branch"
        ).order_by("-timestamp")

        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        qs = qs.filter(timestamp__date=query_date)

        if role_filter != "all":
            qs = qs.filter(role_at_time=role_filter)

        qs = qs[:limit]

        # Daily lock summary per branch for the requested date
        lock_qs = StockDailyLock.objects.filter(date=query_date).select_related(
            "locked_by", "branch"
        )
        if branch_id:
            lock_qs = lock_qs.filter(branch_id=branch_id)

        logs = [{
            "id":           str(log.id),
            "branch":       log.branch.name if log.branch else "—",
            "branch_id":    str(log.branch_id),
            "item":         log.menu_item.name if log.menu_item else "—",
            "change_type":  log.change_type,
            "qty_before":   log.qty_before,
            "qty_changed":  log.qty_changed,
            "qty_after":    log.qty_after,
            "changed_by":   log.changed_by.name if log.changed_by else "System",
            "role":         log.role_at_time,
            "reason":       log.reason,
            "timestamp":    log.timestamp.isoformat(),
        } for log in qs]

        locks = [{
            "branch":      lk.branch.name if lk.branch else "—",
            "branch_id":   str(lk.branch_id),
            "locked_by":   lk.locked_by.name if lk.locked_by else "System",
            "locked_at":   lk.locked_at.isoformat() if lk.locked_at else None,
            "note":        lk.note,
            "total_remaining": lk.total_remaining,
            "total_added":     lk.total_added,
        } for lk in lock_qs]

        return ok({"logs": logs, "locks": locks, "date": date_str})
