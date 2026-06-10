"""
apps/orders/views.py

Customer:
  POST /api/v1/orders/                  → place order
  GET  /api/v1/orders/my/              → customer's own orders
  GET  /api/v1/orders/:id/             → order detail

Staff:
  GET  /api/v1/orders/queue/           → live order queue for branch
  PATCH /api/v1/orders/:id/status/     → update order status

Admin:
  GET  /api/v1/admin/orders/           → all orders for branch (paginated)
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import (
    PlaceOrderSerializer,
    OrderDetailSerializer,
    UpdateOrderStatusSerializer,
)
from apps.accounts.permissions import (
    IsCustomer, IsStaff, IsAdminOrAbove, IsStaffOrAbove,
    get_request_branch_id,
)


def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


def _send_whatsapp_invoice(order):
    """
    Send a WhatsApp invoice message to the customer via the broadcast session
    immediately after an order is marked COMPLETED.
    Fires-and-forgets — any exception is silenced by the caller.
    """
    import requests as _req
    from django.conf import settings

    phone = order.customer.phone if order.customer_id else None
    if not phone:
        return

    wa_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    wa_key = getattr(settings, "WHATSAPP_INTERNAL_KEY", "")

    # Build item lines (no emoji)
    lines = []
    for item in order.items.all():
        c_note = ""
        if item.customisations:
            names = [c.get("name","") for c in item.customisations if c.get("name")]
            if names:
                c_note = f" ({', '.join(names)})"
        lines.append(f"  - {item.name_snapshot}{c_note} x{item.quantity}  Rs.{float(item.line_total):.2f}")

    pay_method  = {"cash": "Cash", "upi": "UPI", "card": "Card"}.get(order.payment_method, "Cash")
    order_type  = "Dine-in" if order.order_type == "dine_in" else "Pickup"
    items_block = "\n".join(lines)
    invoice_url = f"https://knfcs.com/order/invoice/{order.id}"

    discount_line = f"\nDiscount: -Rs.{float(order.discount):.2f}" if float(order.discount or 0) > 0 else ""
    serial_line   = f"\nPay Ref: {order.payment_serial}"           if order.payment_serial else ""

    text = (
        f"*KNFC Fried Chicken - Order Ready*\n"
        f"Token: *{order.token_number}* | {order_type}\n"
        f"Customer: {order.customer.name}\n\n"
        f"*Items:*\n{items_block}\n\n"
        f"Total: *Rs.{float(order.total):.2f}* ({pay_method})"
        f"{discount_line}"
        f"{serial_line}\n\n"
        f"View Invoice: {invoice_url}\n\n"
        f"Thank you for choosing KNFC Fried Chicken!"
    )

    _req.post(
        f"{wa_url}/send-message",
        json={"phone": phone, "text": text},
        headers={"Content-Type": "application/json", "X-Internal-Key": wa_key},
        timeout=6,
    )


def _trigger_referral_reward(order):
    """
    Called when an order is marked COMPLETED.
    Checks if the customer was referred by another customer and, if so,
    grants the referrer their reward (coupon via WhatsApp).
    Only fires for STATUS_SIGNED_UP usages — avoids double-rewarding.
    """
    from apps.offers.models import ReferralUsage
    from apps.offers.views import _grant_referral_reward

    usage = (
        ReferralUsage.objects
        .filter(
            referred_user_id=order.customer_id,
            status=ReferralUsage.STATUS_SIGNED_UP,
            link__offer__is_active=True,
        )
        .select_related("link__offer", "link__referrer")
        .first()
    )
    if not usage:
        return

    offer = usage.link.offer

    # Skip if reward was already handled at signup
    if offer.referral_reward_on_signup:
        return

    # Check minimum order value
    if offer.referral_min_friend_order and float(order.total) < float(offer.referral_min_friend_order):
        return

    # Advance status to ordered so we know the qualifying order
    usage.status = ReferralUsage.STATUS_ORDERED
    usage.qualifying_order = order
    usage.save(update_fields=["status", "qualifying_order"])

    # Grant the reward (generates coupon + sends WhatsApp to referrer)
    _grant_referral_reward(usage.link, usage)


class PlaceOrderView(APIView):
    """
    POST /api/v1/orders/
    Customer or Staff places a new order.
    Stock is deducted atomically.
    Token is auto-generated.
    """
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        from apps.accounts.throttles import OrderPlaceThrottle
        return [OrderPlaceThrottle()]

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user       = request.user
        branch_id  = get_request_branch_id(request) or request.data.get("branch_id")

        if not branch_id:
            return err("branch_id is required.")

        from apps.branches.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id, is_active=True)
        except Branch.DoesNotExist:
            return err("Branch not found.")

        # Enforce branch order mode restrictions
        order_type   = serializer.validated_data.get("order_type")
        table_number = serializer.validated_data.get("table_number")
        if order_type == "pickup" and not branch.enable_pickup:
            return err("This branch does not accept pickup orders.")
        if order_type == "dine_in" and not branch.enable_dine_in:
            return err("This branch does not accept dine-in orders.")

        # Table availability — reject if another active order occupies this table today
        if order_type == "dine_in" and table_number:
            occupied = Order.objects.filter(
                branch=branch,
                order_type="dine_in",
                table_number=table_number,
                status__in=["placed", "confirmed", "preparing", "ready"],
                created_at__date=timezone.localdate(),
            ).exists()
            if occupied:
                return err(
                    f"Table {table_number} is currently occupied by another order. "
                    "Please choose a different table."
                )

        # Block customer orders when shop is closed — staff/admin bypass this
        if user.role == "customer":
            from apps.branches.views import BranchOperatingHoursView
            _checker = BranchOperatingHoursView()
            if not _checker._is_open_now(branch.operating_hours or {}):
                return err("Sorry, this shop is currently closed. Please try again during opening hours.")

        placed_by  = "staff" if user.role == "staff" else "customer"
        staff_user = user if placed_by == "staff" else None

        try:
            order = serializer.create_order(
                user=user,
                branch=branch,
                placed_by=placed_by,
                staff_user=staff_user,
            )
        except Exception as e:
            return err(str(e))

        # Deduct loyalty points if customer redeemed them
        loyalty_pts = int(request.data.get("loyalty_pts_used", 0))
        if loyalty_pts > 0 and user.role == "customer" and user.loyalty_points >= loyalty_pts:
            from django.db.models import F as _F
            from apps.accounts.models import User as _User
            _User.objects.filter(pk=user.pk).update(
                loyalty_points=_F("loyalty_points") - loyalty_pts
            )

        # Push real-time update to connected staff via WebSocket
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"queue_{order.branch_id}",
                    {
                        "type":         "new_order",
                        "token_number": order.token_number,
                        "order_id":     str(order.id),
                    }
                )
        except Exception:
            pass  # WebSocket push failure never blocks order placement

        return ok(
            {
                "message": "Order placed successfully.",
                "order":   OrderDetailSerializer(order).data,
            },
            code=status.HTTP_201_CREATED,
        )


class MyOrdersView(APIView):
    """GET /api/v1/orders/my/ — customer's own order history."""
    permission_classes = [IsCustomer]

    def get(self, request):
        orders = Order.objects.filter(
            customer=request.user,
        ).prefetch_related("items__menu_item").order_by("-created_at")[:20]

        return ok({"orders": OrderDetailSerializer(orders, many=True).data})


class OrderDetailView(APIView):
    """GET /api/v1/orders/:id/ — single order detail."""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return err("Order not found.", status.HTTP_404_NOT_FOUND)

        # Customers can only see their own orders
        if request.user.role == "customer" and order.customer_id != request.user.id:
            return err("Access denied.", status.HTTP_403_FORBIDDEN)

        # Staff/Admin can only see orders from their branch
        if request.user.role in ("staff", "branch_admin"):
            if str(order.branch_id) != str(request.user.branch_id):
                return err("Access denied.", status.HTTP_403_FORBIDDEN)

        return ok({"order": OrderDetailSerializer(order).data})


class OrderQueueView(APIView):
    """
    GET /api/v1/orders/queue/
    Staff: live order queue for their branch.
    Returns active orders sorted by time — carried-over first.
    """
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        branch_id = get_request_branch_id(request)

        active_statuses = [
            OrderStatus.PLACED,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
        ]

        orders = Order.objects.filter(
            branch_id=branch_id,
            status__in=active_statuses,
        ).prefetch_related("items__menu_item").order_by(
            "-carried_over",   # Carried-over orders first
            "created_at",      # Then oldest first
        )

        return ok({
            "queue":         OrderDetailSerializer(orders, many=True).data,
            "total_active":  orders.count(),
            "carried_over":  orders.filter(carried_over=True).count(),
        })


class UpdateOrderStatusView(APIView):
    """PATCH /api/v1/orders/:id/status/ — Staff updates order status through the defined flow."""
    permission_classes = [IsStaffOrAbove]

    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id, branch_id=request.user.branch_id)
        except Order.DoesNotExist:
            return err("Order not found.", status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderStatusSerializer(
            data=request.data,
            context={"current_status": order.status}
        )
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = serializer.validated_data["status"]
        order.update_status(new_status)

        # Record who completed the order; auto-mark cash orders as paid
        if new_status == OrderStatus.COMPLETED:
            save_fields = ["completed_by"]
            order.completed_by = request.user
            if order.payment_method == "cash" and order.payment_status == "pending":
                order.payment_status    = "paid"
                order.payment_marked_by = request.user
                save_fields += ["payment_status", "payment_marked_by"]
            order.save(update_fields=save_fields)

        # Award loyalty points when order is COMPLETED — rate from SiteConfig
        if new_status == OrderStatus.COMPLETED and order.customer_id:
            try:
                from apps.accounts.models import User
                from apps.branches.site_config import SiteConfig
                from django.db.models import F
                cfg = SiteConfig.get()
                if cfg.loyalty_enabled:
                    pts = max(1, int(float(order.total) * float(cfg.loyalty_earn_rate)))
                    User.objects.filter(pk=order.customer_id).update(
                        loyalty_points=F("loyalty_points") + pts
                    )
            except Exception:
                pass  # Points failure must never block status update

        # Send WhatsApp invoice to customer when order is COMPLETED
        if new_status == OrderStatus.COMPLETED and order.customer_id and order.customer.phone:
            try:
                _send_whatsapp_invoice(order)
            except Exception:
                pass  # WhatsApp failure never blocks status update

        # Grant referral reward to referrer if this was the friend's qualifying order
        if new_status == OrderStatus.COMPLETED and order.customer_id:
            try:
                _trigger_referral_reward(order)
            except Exception:
                pass  # Referral failure never blocks status update

        # Push real-time update to connected staff via WebSocket
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"queue_{order.branch_id}",
                    {
                        "type":         "queue_update",
                        "order_id":     str(order.id),
                        "token_number": order.token_number,
                        "new_status":   new_status,
                    }
                )
        except Exception:
            pass  # WebSocket push failure never blocks status update

        return ok({
            "message": f"Order {order.token_number} updated to {new_status}.",
            "order":   OrderDetailSerializer(order).data,
        })

class CompletedOrdersView(APIView):
    """GET /api/v1/orders/completed/ — today's completed orders for staff."""
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()

        from django.db.models import Sum as _Sum
        orders = Order.objects.filter(
            branch_id=branch_id,
            status=OrderStatus.COMPLETED,
            created_at__date=today,
        ).prefetch_related("items").order_by("-completed_at")

        rev = orders.aggregate(rev=_Sum("total"))["rev"]
        return ok({
            "completed":     OrderDetailSerializer(orders, many=True).data,
            "total_today":   orders.count(),
            "revenue_today": float(rev or 0),
        })


class StaffCompletionStatsView(APIView):
    """GET /api/v1/orders/completion-stats/ — per-staff completion counts for today."""
    permission_classes = [IsStaffOrAbove]

    def get(self, request):
        from django.db.models import Count
        branch_id = get_request_branch_id(request)
        today     = timezone.localdate()

        stats = (
            Order.objects.filter(
                branch_id=branch_id,
                status=OrderStatus.COMPLETED,
                created_at__date=today,
                completed_by__isnull=False,
            )
            .values("completed_by__id", "completed_by__name", "completed_by__role")
            .annotate(completed_count=Count("id"))
            .order_by("-completed_count")
        )

        total_completed = Order.objects.filter(
            branch_id=branch_id,
            status=OrderStatus.COMPLETED,
            created_at__date=today,
        ).count()

        return ok({
            "date": str(today),
            "staff_stats": [
                {
                    "staff_id":  str(r["completed_by__id"]),
                    "name":      r["completed_by__name"],
                    "role":      r["completed_by__role"],
                    "completed": r["completed_count"],
                }
                for r in stats
            ],
            "total_completed": total_completed,
        })


class AdminOrderListView(APIView):
    """GET /api/v1/admin/orders/ — paginated order list for branch admin."""
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        if request.user.role == Role.SUPER_ADMIN:
            qs = Order.objects.all()
            # SuperAdmin branch filter
            branch_id_param = request.query_params.get("branch_id")
            if branch_id_param:
                qs = qs.filter(branch_id=branch_id_param)
        else:
            qs = Order.objects.filter(branch_id=request.user.branch_id)

        # Date filter
        date = request.query_params.get("date")
        if date:
            qs = qs.filter(created_at__date=date)

        # Status filter
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        qs = qs.prefetch_related("items").order_by("-created_at")

        # Pagination
        page     = int(request.query_params.get("page", 1))
        per_page = 20
        start    = (page - 1) * per_page
        end      = start + per_page

        from django.db.models import Sum as _Sum
        rev = qs.aggregate(rev=_Sum("total"))["rev"]
        return ok({
            "orders":        OrderDetailSerializer(qs[start:end], many=True).data,
            "total":         qs.count(),
            "page":          page,
            "per_page":      per_page,
            "total_revenue": float(rev or 0),
        })


class AnalyticsDashboardView(APIView):
    """
    GET /api/v1/orders/analytics/
    Branch Admin and Super Admin.

    Returns:
      - revenue_by_day     — last 7 days [{date, revenue, order_count}]
      - top_items          — top 5 items by quantity sold this month
      - peak_hours         — orders per hour bucket (0-23) last 7 days
      - today_summary      — {orders, revenue, avg_order_value, completed}
      - order_type_split   — {dine_in: N, pickup: N}
      - status_breakdown   — {placed:N, confirmed:N, ...}
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from django.db.models import Sum, Count, Avg
        from django.db.models.functions import TruncDate, ExtractHour
        from datetime import timedelta
        import decimal

        if request.user.role == "super_admin":
            # SuperAdmin can filter by branch_id or see all
            branch_id_param = request.query_params.get("branch_id")
            if branch_id_param:
                branch_qs = Order.objects.filter(branch_id=branch_id_param)
            else:
                branch_qs = Order.objects.all()
        else:
            branch_id = get_request_branch_id(request)
            branch_qs = Order.objects.filter(branch_id=branch_id)

        today  = timezone.localdate()
        week_ago = today - timedelta(days=6)
        month_ago = today - timedelta(days=29)

        # ── Revenue by day (last 7 days) ──────────────────────────────────
        rev_rows = (
            branch_qs
            .filter(
                created_at__date__gte=week_ago,
                status__in=[OrderStatus.COMPLETED, OrderStatus.READY,
                            OrderStatus.PREPARING, OrderStatus.CONFIRMED],
            )
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"), order_count=Count("id"))
            .order_by("day")
        )

        # Fill missing days with 0
        rev_map = {str(r["day"]): r for r in rev_rows}
        revenue_by_day = []
        for i in range(7):
            d = str(week_ago + timedelta(days=i))
            if d in rev_map:
                revenue_by_day.append({
                    "date":        d,
                    "revenue":     float(rev_map[d]["revenue"] or 0),
                    "order_count": rev_map[d]["order_count"],
                })
            else:
                revenue_by_day.append({"date": d, "revenue": 0.0, "order_count": 0})

        # ── Top items this month ──────────────────────────────────────────
        from apps.orders.models import OrderItem
        top_items = (
            OrderItem.objects
            .filter(
                order__in=branch_qs.filter(
                    created_at__date__gte=month_ago,
                    status=OrderStatus.COMPLETED,
                )
            )
            .values("name_snapshot")
            .annotate(total_qty=Sum("quantity"), total_revenue=Sum("line_total"))
            .order_by("-total_qty")[:5]
        )

        # ── Peak hours (last 7 days) ──────────────────────────────────────
        hour_rows = (
            branch_qs
            .filter(created_at__date__gte=week_ago)
            .annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(order_count=Count("id"))
            .order_by("hour")
        )
        hour_map = {r["hour"]: r["order_count"] for r in hour_rows}
        peak_hours = [{"hour": h, "orders": hour_map.get(h, 0)} for h in range(24)]

        # ── Today summary ─────────────────────────────────────────────────
        today_qs = branch_qs.filter(created_at__date=today)
        today_totals = today_qs.aggregate(
            revenue=Sum("total"),
            avg_val=Avg("total"),
            count=Count("id"),
        )
        today_completed = today_qs.filter(status=OrderStatus.COMPLETED).count()

        # ── Order type split ──────────────────────────────────────────────
        type_rows = (
            branch_qs.filter(created_at__date=today)
            .values("order_type")
            .annotate(count=Count("id"))
        )
        type_split = {"dine_in": 0, "pickup": 0}
        for r in type_rows:
            type_split[r["order_type"]] = r["count"]

        # ── Status breakdown (active) ─────────────────────────────────────
        status_rows = (
            branch_qs.filter(created_at__date=today)
            .values("status")
            .annotate(count=Count("id"))
        )
        status_breakdown = {r["status"]: r["count"] for r in status_rows}

        return ok({
            "revenue_by_day": revenue_by_day,
            "top_items": [
                {
                    "name":          t["name_snapshot"],
                    "quantity_sold": t["total_qty"],
                    "revenue":       float(t["total_revenue"] or 0),
                }
                for t in top_items
            ],
            "peak_hours": peak_hours,
            "today_summary": {
                "orders":          today_totals["count"] or 0,
                "revenue":         float(today_totals["revenue"] or 0),
                "avg_order_value": float(today_totals["avg_val"] or 0),
                "completed":       today_completed,
            },
            "order_type_split":  type_split,
            "status_breakdown":  status_breakdown,
        })


class LoyaltyRedeemView(APIView):
    """
    POST /api/v1/orders/loyalty/redeem/
    { points: 500 }
    Validates customer has enough points and loyalty is enabled.
    Rate and rules come from SiteConfig (SuperAdmin-controlled).
    """
    permission_classes = [IsCustomer]
    throttle_classes   = []

    def post(self, request):
        from apps.branches.site_config import SiteConfig
        cfg = SiteConfig.get()

        if not cfg.loyalty_enabled:
            return err("Loyalty programme is currently disabled.")

        points_to_redeem = int(request.data.get("points", 0))
        if points_to_redeem <= 0:
            return err("points must be a positive integer.")

        user = request.user
        if user.loyalty_points < points_to_redeem:
            return err(f"Insufficient points. You have {user.loyalty_points} pts.")

        min_pts  = cfg.loyalty_min_redeem
        step_pts = cfg.loyalty_redeem_step

        if points_to_redeem < min_pts:
            return err(f"Minimum redemption is {min_pts} points.")

        if step_pts > 0 and points_to_redeem % step_pts != 0:
            return err(f"Points must be redeemed in multiples of {step_pts}.")

        discount = round(points_to_redeem * float(cfg.loyalty_redeem_rate), 2)
        return ok({
            "points_to_redeem": points_to_redeem,
            "discount_amount":  discount,
            "remaining_points": user.loyalty_points - points_to_redeem,
            "message": f"Redeeming {points_to_redeem} pts for ₹{discount} off.",
        })


class MarkPaymentView(APIView):
    """
    PATCH /api/v1/orders/<order_id>/payment/
    Staff marks payment received.

    Body: { payment_status: "paid"|"waived", payment_serial?: "PAY001" }
    Staff or above.
    """
    permission_classes = [IsStaffOrAbove]

    def patch(self, request, order_id):
        from apps.accounts.permissions import get_request_branch_id
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return err("Order not found.", 404)

        branch_id = get_request_branch_id(request)
        if str(order.branch_id) != str(branch_id) and request.user.role != "super_admin":
            return err("Not found.", 404)

        status_val = request.data.get("payment_status")
        if status_val not in ("paid", "waived"):
            return err("payment_status must be 'paid' or 'waived'.")

        update_fields = ["payment_status", "payment_marked_by"]
        order.payment_status    = status_val
        order.payment_marked_by = request.user

        # Auto-generate payment serial server-side (read-only, non-editable)
        if not order.payment_serial:
            today = timezone.localdate()
            last_serial = (
                Order.objects.filter(
                    branch=order.branch,
                    created_at__date=today,
                    payment_serial__startswith="PAY",
                )
                .exclude(payment_serial="")
                .order_by("-payment_serial")
                .values_list("payment_serial", flat=True)
                .first()
            )
            if last_serial:
                try:
                    n = int(last_serial.replace("PAY", "")) + 1
                except (ValueError, AttributeError):
                    n = 1
            else:
                n = 1
            order.payment_serial = f"PAY{n:03d}"
            update_fields.append("payment_serial")

        if request.data.get("upi_ref"):
            order.upi_ref = str(request.data["upi_ref"])[:50]
            update_fields.append("upi_ref")
        order.save(update_fields=update_fields)

        return ok({
            "order_id":        str(order.id),
            "token_number":    order.token_number,
            "payment_status":  order.payment_status,
            "payment_serial":  order.payment_serial,
            "payment_method":  order.payment_method,
            "marked_by":       request.user.name,
        })


class PaymentLogsView(APIView):
    """
    GET /api/v1/orders/payment-logs/
    Super admin only — lists all paid/waived orders with payment details.
    Supports ?branch_id= and ?date= filters.
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.permissions import get_request_branch_id
        from django.db.models import Q
        qs = Order.objects.filter(
            Q(payment_status__in=["paid", "waived"]) |
            Q(payment_method="cash", status="completed")
        ).select_related("branch", "payment_marked_by", "customer").order_by("-created_at")

        # Super admin can filter by branch; branch admin sees only their branch
        if request.user.role != "super_admin":
            branch_id = get_request_branch_id(request)
            qs = qs.filter(branch_id=branch_id)
        elif request.query_params.get("branch_id"):
            qs = qs.filter(branch_id=request.query_params["branch_id"])

        if request.query_params.get("date"):
            try:
                from datetime import date as _date
                d = _date.fromisoformat(request.query_params["date"])
                qs = qs.filter(created_at__date=d)
            except ValueError:
                pass

        method_param = request.query_params.get("method")
        if method_param and method_param in ("upi", "cash", "card"):
            qs = qs.filter(payment_method=method_param)

        logs = []
        for o in qs[:500]:
            logs.append({
                "order_id":        str(o.id),
                "token_number":    o.token_number,
                "branch_name":     o.branch.name if o.branch_id else "",
                "payment_method":  o.payment_method,
                "payment_status":  o.payment_status,
                "payment_serial":  o.payment_serial,
                "total":           float(o.total),
                "marked_by":       o.payment_marked_by.name if o.payment_marked_by_id else "",
                "customer_name":   o.walkin_name or (o.customer.name if o.customer_id else ""),
                "created_at":      o.created_at.isoformat(),
            })

        return ok({"logs": logs, "count": len(logs)})


CANCEL_REASONS = {
    "customer_request":  "Customer requested cancellation",
    "out_of_stock":      "Item(s) out of stock",
    "long_wait":         "Customer unwilling to wait",
    "duplicate_order":   "Duplicate / accidental order",
    "payment_failed":    "Payment not received",
}


class CancelOrderView(APIView):
    """
    PATCH /api/v1/orders/<order_id>/cancel/
    { reason: "out_of_stock", note: "Optional extra detail" }

    Customer: can cancel only while status is 'placed'.
    Staff/Admin: can cancel any non-completed order, must provide a reason.
    On cancel: stock restored, WebSocket push to branch queue.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return err("Order not found.", 404)

        user   = request.user
        reason = request.data.get("reason", "customer_request")
        note   = request.data.get("note", "")

        if reason not in CANCEL_REASONS:
            reason = "customer_request"

        # Customers: own order, placed status only
        if user.role == "customer":
            if str(order.customer_id) != str(user.pk):
                return err("Not found.", 404)
            if order.status != OrderStatus.PLACED:
                return err("Order can only be cancelled before it is confirmed by staff.")

        # Staff / Admin: any non-completed order
        elif user.role in ("staff", "branch_admin", "super_admin"):
            if order.status == OrderStatus.COMPLETED:
                return err("Completed orders cannot be cancelled.")
        else:
            return err("Not authorised.", 403)

        if order.status == OrderStatus.CANCELLED:
            return err("Order is already cancelled.")

        # Restore stock + cancel
        from apps.stock.models import StockRecord
        from django.db import transaction
        with transaction.atomic():
            for item in order.items.all():
                try:
                    stock = StockRecord.objects.select_for_update().get(
                        branch=order.branch,
                        menu_item=item.menu_item,
                        date=order.created_at.date(),
                    )
                    stock.used_stock     = max(0, stock.used_stock - item.quantity)
                    stock.remaining_stock = stock.today_stock - stock.used_stock
                    stock.save(update_fields=["used_stock", "remaining_stock", "last_updated"])
                    if not item.menu_item.is_available:
                        item.menu_item.is_available = True
                        item.menu_item.save(update_fields=["is_available"])
                except StockRecord.DoesNotExist:
                    pass

            order.cancel_reason = reason
            order.cancel_note   = note[:500]
            order.update_status(OrderStatus.CANCELLED)

        # WebSocket push
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"queue_{order.branch_id}",
                    {
                        "type":        "queue_update",
                        "order_id":    str(order.id),
                        "new_status":  "cancelled",
                        "cancel_reason": CANCEL_REASONS.get(reason, reason),
                        "token":       order.token_number,
                    }
                )
        except Exception:
            pass

        return ok({
            "order_id":      str(order.id),
            "token_number":  order.token_number,
            "status":        "cancelled",
            "cancel_reason": CANCEL_REASONS.get(reason, reason),
            "message":       f"Order cancelled — {CANCEL_REASONS.get(reason, reason)}",
        })


class CancelReasonsView(APIView):
    """GET /api/v1/orders/cancel-reasons/ — returns the 5 cancellation reason options."""
    permission_classes = []
    throttle_classes   = []

    def get(self, request):
        return Response({"success": True, "reasons": [
            {"key": k, "label": v} for k, v in CANCEL_REASONS.items()
        ]})


class ExportOrdersCSVView(APIView):
    """
    GET /api/v1/orders/export/csv/
    Branch Admin or Super Admin exports orders to CSV.
    ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&branch_id=
    """
    permission_classes = [IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        import csv, io
        from apps.accounts.permissions import get_request_branch_id

        branch_id  = request.query_params.get("branch_id") or get_request_branch_id(request)
        date_from  = request.query_params.get("date_from")
        date_to    = request.query_params.get("date_to")

        qs = Order.objects.filter(branch_id=branch_id).select_related(
            "customer", "branch"
        ).prefetch_related("items__menu_item").order_by("-created_at")

        import datetime
        if date_from:
            try: qs = qs.filter(created_at__date__gte=datetime.date.fromisoformat(date_from))
            except: pass
        if date_to:
            try: qs = qs.filter(created_at__date__lte=datetime.date.fromisoformat(date_to))
            except: pass

        buf = io.StringIO()
        w   = csv.writer(buf)
        w.writerow([
            "Order ID", "Token", "Date", "Time", "Customer", "Phone",
            "Type", "Table", "Items", "Subtotal", "Discount", "Total",
            "Payment", "Payment Status", "Order Status", "Cancel Reason"
        ])
        for o in qs:
            items_str = "; ".join(
                f"{i.menu_item.name} x{i.quantity}" for i in o.items.all()
            )
            w.writerow([
                str(o.id)[:8],
                o.token_number,
                o.created_at.strftime("%Y-%m-%d"),
                o.created_at.strftime("%H:%M"),
                o.customer.name if o.customer else (o.walkin_name or "Walk-in"),
                o.customer.phone if o.customer else (o.walkin_phone or ""),
                o.order_type,
                o.table_number or "",
                items_str,
                float(o.subtotal or 0),
                float(o.discount or 0),
                float(o.total or 0),
                o.payment_method,
                o.payment_status,
                o.status,
                o.cancel_reason or "",
            ])

        from django.http import HttpResponse
        response = HttpResponse(buf.getvalue(), content_type="text/csv")
        fname = f"orders_{date_from or 'all'}_{date_to or 'all'}.csv"
        response["Content-Disposition"] = f'attachment; filename="{fname}"'
        return response


class ExportCustomersCSVView(APIView):
    """
    GET /api/v1/orders/export/customers/
    Super Admin exports all customers to CSV.
    """
    permission_classes = [IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        import csv, io
        from apps.accounts.models import User, Role
        from apps.accounts.permissions import get_request_branch_id

        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)

        # Customers who ordered from this branch
        customer_ids = Order.objects.filter(
            branch_id=branch_id, customer__isnull=False
        ).values_list("customer_id", flat=True).distinct()

        customers = User.objects.filter(
            id__in=customer_ids, role=Role.CUSTOMER
        ).order_by("-date_joined")

        buf = io.StringIO()
        w   = csv.writer(buf)
        w.writerow([
            "Name", "Phone", "Email", "Date Joined", "Last Order", "Loyalty Points", "Total Orders"
        ])

        for c in customers:
            last_order = Order.objects.filter(
                customer=c, branch_id=branch_id
            ).order_by("-created_at").values_list("created_at", flat=True).first()

            order_count = Order.objects.filter(
                customer=c, branch_id=branch_id
            ).exclude(status="cancelled").count()

            w.writerow([
                c.name,
                c.phone or "",
                c.email or "",
                c.date_joined.strftime("%Y-%m-%d") if c.date_joined else "",
                last_order.strftime("%Y-%m-%d") if last_order else "",
                c.loyalty_points,
                order_count,
            ])

        from django.http import HttpResponse
        response = HttpResponse(buf.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers.csv"'
        return response


class PublicInvoiceView(APIView):
    """
    GET /api/v1/orders/<order_id>/invoice/
    Public � no auth required. Returns invoice data for the order.
    The UUID order ID is unguessable, which provides sufficient access control.
    Used by the WhatsApp invoice link and the printable invoice page.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request, order_id):
        try:
            order = Order.objects.select_related(
                "branch", "customer", "offer",
                "completed_by", "placed_by_staff", "payment_marked_by",
            ).prefetch_related("items").get(id=order_id)
        except Order.DoesNotExist:
            return Response({"success": False, "error": "Invoice not found."}, status=404)

        items = []
        for item in order.items.all():
            c_names = [c.get("name", "") for c in (item.customisations or []) if c.get("name")]
            items.append({
                "name":           item.name_snapshot,
                "price":          str(item.price_snapshot),
                "quantity":       item.quantity,
                "line_total":     str(item.line_total),
                "customisations": ", ".join(c_names),
                "note":           item.special_instructions,
            })

        pay_labels = {"cash": "Cash", "upi": "UPI", "card": "Card"}

        # Staff who handled the order
        served_by = (
            getattr(order.completed_by,  "name", None)
            or getattr(order.placed_by_staff, "name", None)
            or getattr(order.payment_marked_by, "name", None)
            or ""
        )

        data = {
            "id":               str(order.id),
            "token_number":     order.token_number,
            "branch_name":      order.branch.name    if order.branch else "",
            "branch_address":   order.branch.address if order.branch else "",
            "branch_phone":     order.branch.phone   if order.branch else "",
            "branch_email":     order.branch.email   if order.branch else "",
            "order_type":       order.order_type,
            "table_number":     order.table_number,
            "customer_name":    order.customer.name  if order.customer_id else (order.walkin_name  or "Walk-in"),
            "customer_phone":   order.customer.phone if order.customer_id else (order.walkin_phone or ""),
            "served_by":        served_by,
            "status":           order.status,
            "items":            items,
            "subtotal":         str(order.subtotal),
            "discount":         str(order.discount or 0),
            "total":            str(order.total),
            "payment_method":   pay_labels.get(order.payment_method, order.payment_method),
            "payment_status":   order.payment_status,
            "payment_serial":   order.payment_serial or "",
            "upi_ref":          order.upi_ref        or "",
            "points_earned":    order.points_earned,
            "special_instructions": order.special_instructions or "",
            "created_at":       order.created_at.isoformat(),
            "confirmed_at":     order.confirmed_at.isoformat() if order.confirmed_at else None,
            "completed_at":     order.completed_at.isoformat() if order.completed_at else None,
        }
        return Response({"success": True, "invoice": data})
