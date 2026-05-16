from django.contrib import admin
from apps.orders.models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ["token_number", "branch", "customer_display_name", "order_type", "status", "total", "created_at"]
    list_filter   = ["branch", "status", "order_type", "placed_by"]
    search_fields = ["token_number"]
    inlines       = [OrderItemInline]
    readonly_fields = ["token_number", "created_at", "confirmed_at", "ready_at", "completed_at"]
