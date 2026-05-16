"""apps/stock/serializers.py"""
from rest_framework import serializers
from apps.stock.models import StockRecord, StockLog, StockAlert


class StockRecordSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    menu_item_emoji= serializers.CharField(source="menu_item.emoji", read_only=True)
    category       = serializers.CharField(source="menu_item.category.name", read_only=True)
    status         = serializers.ReadOnlyField()
    status_color   = serializers.ReadOnlyField()
    threshold      = serializers.IntegerField(source="menu_item.low_stock_threshold", read_only=True)

    class Meta:
        model  = StockRecord
        fields = [
            "id", "menu_item", "menu_item_name", "menu_item_emoji",
            "category", "date",
            "yesterday_remaining", "new_stock_added",
            "today_stock", "used_stock", "remaining_stock",
            "status", "status_color", "threshold",
        ]


class StockLogSerializer(serializers.ModelSerializer):
    item        = serializers.CharField(source="menu_item.name", read_only=True)
    changed_by  = serializers.SerializerMethodField()

    class Meta:
        model  = StockLog
        fields = [
            "id", "item", "change_type",
            "qty_before", "qty_changed", "qty_after",
            "changed_by", "role_at_time", "reason", "timestamp",
        ]

    def get_changed_by(self, obj):
        return obj.changed_by.name if obj.changed_by else "System"


class StockAlertSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model  = StockAlert
        fields = [
            "id", "menu_item", "menu_item_name",
            "alert_type", "remaining", "is_seen", "created_at",
        ]


class SetOpeningStockSerializer(serializers.Serializer):
    """Admin sets the opening stock for a menu item at start of day."""
    menu_item_id = serializers.UUIDField()
    quantity     = serializers.IntegerField(min_value=0)
    reason       = serializers.CharField(max_length=200, required=False, allow_blank=True)
