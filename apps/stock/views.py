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

        records = StockRecord.objects.filter(
            branch_id=branch_id, date=today,
        ).select_related("menu_item", "menu_item__category").order_by(
            "menu_item__category__display_order",
            "menu_item__display_order",
        )

        data = []
        for r in records:
            data.append({
                "menu_item_id":   str(r.menu_item.id),
                "menu_item_name": r.menu_item.name,
                "emoji":          r.menu_item.emoji,
                "category":       r.menu_item.category.name,
                "today_stock":    r.today_stock,
                "used_stock":     r.used_stock,
                "remaining_stock":r.remaining_stock,
                "status":         r.status,
                "status_color":   r.status_color,
                "threshold":      r.menu_item.low_stock_threshold,
                "carries_over":   r.menu_item.carries_over,
            })

        alerts = StockAlert.objects.filter(
            branch_id=branch_id, is_seen=False
        ).count()

        return ok({
            "stock":         data,
            "date":          str(today),
            "alert_count":   alerts,
            "out_of_stock":  sum(1 for d in data if d["status"] == "out"),
            "low_stock":     sum(1 for d in data if d["status"] in ("low", "critical")),
        })


class StockTopUpView(APIView):
    """
    POST /api/v1/stock/topup/
    Staff, Branch Admin, Super Admin can add stock mid-day.
    Creates full audit log entry.
    """
    permission_classes = [IsStaffOrAbove]

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

        try:
            record = StockRecord.objects.get(
                branch_id=branch_id,
                menu_item_id=menu_item_id,
                date=today,
            )
        except StockRecord.DoesNotExist:
            # Create record if it doesn't exist yet today
            from apps.menu.models import MenuItem
            try:
                item = MenuItem.objects.get(id=menu_item_id, branch_id=branch_id)
            except MenuItem.DoesNotExist:
                return err("Menu item not found.")
            record = StockRecord.objects.create(
                branch_id=branch_id,
                menu_item=item,
                date=today,
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
