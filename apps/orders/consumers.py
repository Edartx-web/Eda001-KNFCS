"""
apps/orders/consumers.py

WebSocket consumer for the live order queue.

Connection URL: ws://host/ws/queue/<branch_id>/
Auth: JWT passed as ?token=<access_token> query param.

Events sent to client:
  { type: "queue_update", queue: [...], completed: [...], alert_count: N }
  { type: "new_order",    token_number: "T042", count: 3 }

Staff connect → join branch group → receive live pushes whenever:
  - A new order is placed (PlaceOrderView calls group_send)
  - An order status changes (UpdateOrderStatusView calls group_send)

Falls back gracefully: if Redis / Channels not available the HTTP
polling in QueuePage still works — both can coexist.
"""

import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs


class _Encoder(json.JSONEncoder):
    """Serialize UUID (and Decimal) values that stdlib json cannot handle."""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        from decimal import Decimal
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


class OrderQueueConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.branch_id = self.scope["url_route"]["kwargs"]["branch_id"]
        self.group_name = f"queue_{self.branch_id}"

        # Auth: validate JWT from query string
        query = parse_qs(self.scope["query_string"].decode())
        token = query.get("token", [None])[0]

        if not await self._auth(token):
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current queue state immediately on connect
        data = await self._get_queue_data()
        await self.send(text_data=json.dumps({
            "type":        "queue_update",
            "queue":       data["queue"],
            "completed":   data["completed"],
            "alert_count": data["alert_count"],
        }, cls=_Encoder))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """Client can send 'ping' to get a fresh snapshot."""
        try:
            msg = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            return
        if msg.get("type") == "ping":
            data = await self._get_queue_data()
            await self.send(text_data=json.dumps({
                "type":        "queue_update",
                "queue":       data["queue"],
                "completed":   data["completed"],
                "alert_count": data["alert_count"],
            }, cls=_Encoder))

    # ── Group message handlers ───────────────────────────────────────────

    async def queue_update(self, event):
        """Receives group message → forwards to WebSocket client."""
        await self.send(text_data=json.dumps(event, cls=_Encoder))

    async def new_order(self, event):
        """Receives new_order event → forwards to WebSocket client."""
        await self.send(text_data=json.dumps(event, cls=_Encoder))

    # ── Helpers ─────────────────────────────────────────────────────────

    @database_sync_to_async
    def _auth(self, token):
        if not token:
            return False
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.accounts.models import User
            decoded = AccessToken(token)
            user_id = decoded.get("user_id")
            user = User.objects.get(pk=user_id, is_active=True)
            return user.role in ("staff", "branch_admin", "super_admin")
        except Exception:
            return False

    @database_sync_to_async
    def _get_queue_data(self):
        from apps.orders.models import Order, OrderStatus
        from apps.orders.serializers import OrderDetailSerializer
        from apps.stock.models import StockAlert
        from django.utils import timezone

        today = timezone.localdate()
        queue = Order.objects.filter(
            branch_id=self.branch_id,
            created_at__date=today,
        ).exclude(
            status__in=[OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        ).select_related("customer").prefetch_related("items__menu_item").order_by("created_at")

        completed = Order.objects.filter(
            branch_id=self.branch_id,
            created_at__date=today,
            status=OrderStatus.COMPLETED,
        ).select_related("customer").prefetch_related("items__menu_item").order_by("-completed_at")[:20]

        alert_count = StockAlert.objects.filter(
            branch_id=self.branch_id, is_seen=False
        ).count()

        return {
            "queue":       OrderDetailSerializer(queue, many=True).data,
            "completed":   OrderDetailSerializer(completed, many=True).data,
            "alert_count": alert_count,
        }
