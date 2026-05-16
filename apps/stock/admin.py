from django.contrib import admin
from apps.stock.models import StockRecord, StockLog, StockAlert

@admin.register(StockRecord)
class StockRecordAdmin(admin.ModelAdmin):
    list_display = ["menu_item", "branch", "date", "today_stock", "used_stock", "remaining_stock", "status"]
    list_filter  = ["branch", "date"]

@admin.register(StockLog)
class StockLogAdmin(admin.ModelAdmin):
    list_display = ["menu_item", "change_type", "qty_before", "qty_changed", "qty_after", "changed_by", "timestamp"]
    list_filter  = ["change_type", "branch"]

@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ["menu_item", "branch", "alert_type", "remaining", "is_seen", "created_at"]
    list_filter  = ["alert_type", "is_seen"]
