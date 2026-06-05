"""apps/orders/serializers.py"""
from rest_framework import serializers
from django.db import transaction
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.menu.models import MenuItem

def _get_item_category(item_id):
    """Return category_id for a menu item UUID, or None."""
    if not item_id:
        return None
    try:
        return MenuItem.objects.values_list("category_id", flat=True).get(id=item_id)
    except MenuItem.DoesNotExist:
        return None
from apps.stock.models import StockRecord
from django.utils import timezone


class OrderItemInputSerializer(serializers.Serializer):
    """One item in the order placement payload."""
    menu_item_id         = serializers.UUIDField()
    quantity             = serializers.IntegerField(min_value=1, max_value=20)
    customisations       = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    special_instructions = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_menu_item_id(self, value):
        try:
            item = MenuItem.objects.select_related("branch").get(id=value, is_available=True)
        except MenuItem.DoesNotExist:
            raise serializers.ValidationError("Item is not available or out of stock.")
        return value


class PlaceOrderSerializer(serializers.Serializer):
    """Full order placement payload."""
    order_type           = serializers.ChoiceField(choices=["dine_in", "pickup"])
    table_number         = serializers.IntegerField(required=False, min_value=1)
    items                = OrderItemInputSerializer(many=True, min_length=1)
    offer_id             = serializers.UUIDField(required=False)
    special_instructions = serializers.CharField(max_length=500, required=False, allow_blank=True)
    payment_method       = serializers.ChoiceField(choices=["cash","upi","card"], default="cash")
    # Walk-in fields (staff placing order)
    walkin_name          = serializers.CharField(max_length=100, required=False, allow_blank=True)
    walkin_phone         = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate_walkin_phone(self, value):
        if not value:
            return value
        digits = "".join(c for c in value if c.isdigit())
        if len(digits) != 10 or digits[0] not in "6789":
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)."
            )
        return digits

    def validate(self, data):
        if data["order_type"] == "dine_in" and not data.get("table_number"):
            raise serializers.ValidationError({"table_number": "Table number required for dine-in."})
        return data

    def _check_table_availability(self, branch, table_number):
        """Return True if the table is free (no active dine-in order on it today)."""
        if not table_number:
            return True
        occupied = Order.objects.filter(
            branch=branch,
            order_type="dine_in",
            table_number=table_number,
            status__in=["placed", "confirmed", "preparing", "ready"],
            created_at__date=timezone.localdate(),
        ).exists()
        return not occupied

    @transaction.atomic
    def create_order(self, user, branch, placed_by="customer", staff_user=None):
        """Create order, deduct stock, log everything."""
        data = self.validated_data

        # Resolve offer — match branch-specific OR all_branches global offers
        offer = None
        if data.get("offer_id"):
            from apps.offers.models import DailyOffer, OfferRedemption as _OR
            from django.db.models import Q as _Q
            offer = DailyOffer.objects.filter(
                _Q(id=data["offer_id"], is_active=True) &
                (_Q(branch=branch) | _Q(all_branches=True))
            ).first()
            if offer and not offer.is_valid_now:
                offer = None  # silently drop expired offer

            # Pre-flight: WELCOME bonus strictly once per customer (fail fast, before order creation)
            if offer and user and user.pk and placed_by == "customer":
                if offer.offer_type == "welcome":
                    if _OR.objects.filter(offer=offer, customer=user).exists():
                        raise serializers.ValidationError(
                            "Welcome bonus can only be used once per account."
                        )

        # Create order header
        order = Order(
            branch=branch,
            customer=user if placed_by == "customer" else None,
            order_type=data["order_type"],
            table_number=data.get("table_number"),
            placed_by=placed_by,
            placed_by_staff=staff_user,
            walkin_name=data.get("walkin_name", ""),
            walkin_phone=data.get("walkin_phone", ""),
            special_instructions=data.get("special_instructions", ""),
            offer=offer,
            payment_method=data.get("payment_method", "cash"),
            payment_status="pending",
        )
        order.save()

        subtotal = 0

        # Create order items + deduct stock
        for item_data in data["items"]:
            menu_item = MenuItem.objects.select_for_update().get(id=item_data["menu_item_id"])
            qty       = item_data["quantity"]

            # Stock deduction - stock MUST be updated today before orders are accepted
            try:
                stock = StockRecord.objects.select_for_update().get(
                    branch=branch,
                    menu_item=menu_item,
                    date=timezone.localdate(),
                )
                if stock.remaining_stock <= 0:
                    raise serializers.ValidationError(
                        menu_item.name + " is out of stock. Please choose another item."
                    )
                if not stock.deduct(qty):
                    raise serializers.ValidationError(
                        "Only " + str(stock.remaining_stock) + " portion(s) of " + menu_item.name + " left."
                    )
            except StockRecord.DoesNotExist:
                # Fallback: the customer may have ordered an all_branches=True item
                # while this branch stocks a branch-specific item with the same name.
                # Try to find the branch-specific item and its stock record.
                if menu_item.all_branches:
                    alt = MenuItem.objects.filter(
                        name=menu_item.name,
                        branch_id=branch.id,
                        all_branches=False,
                    ).first()
                    if alt:
                        try:
                            stock = StockRecord.objects.select_for_update().get(
                                branch=branch,
                                menu_item=alt,
                                date=timezone.localdate(),
                            )
                            menu_item = alt  # swap to branch-specific item for the order
                        except StockRecord.DoesNotExist:
                            raise serializers.ValidationError(
                                menu_item.name + " is currently unavailable. Please try another item."
                            )
                    else:
                        raise serializers.ValidationError(
                            menu_item.name + " is currently unavailable. Please try another item."
                        )
                else:
                    raise serializers.ValidationError(
                        menu_item.name + " is currently unavailable. Please try another item."
                    )
                if stock.remaining_stock <= 0:
                    raise serializers.ValidationError(
                        menu_item.name + " is out of stock. Please choose another item."
                    )
                if not stock.deduct(qty):
                    raise serializers.ValidationError(
                        "Only " + str(stock.remaining_stock) + " portion(s) of " + menu_item.name + " left."
                    )
            # Calculate customisation extras
            extra = sum(
                float(c.get("extra_price", 0))
                for c in item_data.get("customisations", [])
            )
            # Use discounted price if a discount is set — never charge MRP when an
            # item has a discount % configured.
            selling_price = float(menu_item.get_discounted_price())
            line_total    = (selling_price + extra) * qty

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                name_snapshot=menu_item.name,
                price_snapshot=selling_price,   # price customer actually pays
                quantity=qty,
                line_total=line_total,
                customisations=item_data.get("customisations", []),
                special_instructions=item_data.get("special_instructions", ""),
            )
            subtotal += line_total

        # Apply offer discount
        discount = 0
        if offer and offer.discount_percentage:
            # Enforce minimum order value
            if offer.min_order_value and subtotal < float(offer.min_order_value):
                offer = None  # silently drop offer — don't error, just don't apply
            else:
                # Category restriction — only discount items in the offer's category
                if offer.category_id:
                    cat_subtotal = sum(
                        float(item_data.get("price", 0)) * item_data.get("quantity", 1)
                        for item_data in data["items"]
                        if _get_item_category(item_data.get("menu_item_id")) == offer.category_id
                    )
                    discount = cat_subtotal * (float(offer.discount_percentage) / 100)
                else:
                    discount = subtotal * (float(offer.discount_percentage) / 100)
        elif offer and offer.discount_flat:
            if offer.min_order_value and subtotal < float(offer.min_order_value):
                offer = None
            else:
                discount = float(offer.discount_flat)
        elif offer and offer.welcome_bonus_amount:
            # WELCOME type — flat bonus amount (uses its own dedicated field)
            if offer.min_order_value and subtotal < float(offer.min_order_value):
                offer = None
            else:
                discount = float(offer.welcome_bonus_amount)

        # Offer eligibility checks (customer only — staff walk-in orders skip per-user limits)
        if offer and user and user.pk and placed_by == "customer":
            from apps.offers.models import OfferRedemption as _OR2
            # WELCOME bonus: strictly once per customer, lifetime
            if offer.offer_type == "welcome":
                already = _OR2.objects.filter(offer=offer, customer=user).count()
                if already >= 1:
                    offer = None  # drop silently — don't penalise customer
                    discount = 0

            elif offer.max_redemptions_per_user > 0:
                already = _OR2.objects.filter(offer=offer, customer=user).count()
                if already >= offer.max_redemptions_per_user:
                    raise serializers.ValidationError(
                        "You've already used this offer the maximum number of times."
                    )

            # first_order_only: apply only if customer has no previous completed orders
            if offer and offer.first_order_only:
                prev_orders = Order.objects.filter(
                    customer=user,
                    status="completed",
                ).exclude(pk=order.pk).exists()
                if prev_orders:
                    offer = None
                    discount = 0

        order.subtotal = subtotal
        order.discount = discount
        order.total    = max(0, subtotal - discount)
        order.save(update_fields=["subtotal", "discount", "total"])

        # Record offer redemption so admin can track usage
        if offer and discount > 0:
            from apps.offers.models import OfferRedemption
            from django.db.models import F
            OfferRedemption.objects.create(
                offer=offer,
                customer=user,
                order=order,
                savings=discount,
            )
            # Increment cached redemption counter atomically
            offer.__class__.objects.filter(pk=offer.pk).update(
                redemption_count=F("redemption_count") + 1
            )

        return order


class OrderItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderItem
        fields = [
            "id", "menu_item", "name_snapshot", "price_snapshot",
            "quantity", "line_total",
            "customisations", "special_instructions",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items               = OrderItemDetailSerializer(many=True, read_only=True)
    customer_name       = serializers.ReadOnlyField(source="customer_display_name")
    item_count          = serializers.ReadOnlyField()
    status_display      = serializers.ReadOnlyField(source="status_display_label")
    status_emoji        = serializers.ReadOnlyField()
    branch_name         = serializers.CharField(source="branch.name", read_only=True)
    completed_by_name   = serializers.SerializerMethodField()

    def get_completed_by_name(self, obj):
        return obj.completed_by.name if obj.completed_by_id else None

    class Meta:
        model  = Order
        fields = [
            "id", "token_number", "branch_name",
            "order_type", "table_number",
            "status", "status_display", "status_emoji",
            "placed_by", "customer_name",
            "subtotal", "discount", "total",
            "payment_method", "payment_status", "upi_ref", "payment_serial",
            "items", "item_count",
            "special_instructions",
            "carried_over",
            "completed_by_name",
            "cancel_reason", "cancel_note",
            "created_at", "confirmed_at", "ready_at", "completed_at",
        ]


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        s.value for s in OrderStatus
        if s not in (OrderStatus.PLACED,)   # Staff can't go back to PLACED
    ])

    def validate_status(self, value):
        # Enforce valid transitions
        current = self.context.get("current_status")
        valid_transitions = {
            OrderStatus.PLACED:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
            OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
            OrderStatus.READY:     [OrderStatus.COMPLETED],
            OrderStatus.COMPLETED: [],
            OrderStatus.CANCELLED: [],
        }
        allowed = [s.value for s in valid_transitions.get(current, [])]
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot move from '{current}' to '{value}'. "
                f"Allowed: {allowed}"
            )
        return value
