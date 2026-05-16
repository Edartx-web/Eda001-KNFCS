# apps/offers/admin.py
from django.contrib import admin
from .models import DailyOffer, OfferItem, OfferRedemption

@admin.register(DailyOffer)
class DailyOfferAdmin(admin.ModelAdmin):
    list_display = ['name', 'branch', 'offer_type', 'is_active', 'start_at', 'end_at']
    list_filter = ['is_active', 'offer_type', 'branch']
    search_fields = ['name', 'tagline', 'coupon_code']
    filter_horizontal = ['applies_to']
    readonly_fields = ['view_count', 'redemption_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ("Offer Info", {"fields": ("branch", "name", "tagline", "offer_type", "emoji")}),
        ("Discount & Pricing", {"fields": ("discount_percentage", "discount_flat", 
                                         "original_price", "offer_price")}),
        ("Media", {"fields": ("video", "video_thumbnail", "image")}),
        ("Validity & Targeting", {"fields": ("start_at", "end_at", "is_active", 
                                           "category", "applies_to", "first_order_only", 
                                           "min_order_value", "coupon_code")}),
        ("Analytics", {"fields": ("view_count", "redemption_count", "carousel_order")}),
    )