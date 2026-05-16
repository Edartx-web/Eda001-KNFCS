from django.contrib import admin
from apps.menu.models import MenuCategory, MenuItem, ItemCustomisation, ItemReview

@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "branch", "is_active", "display_order"]
    list_filter   = ["branch", "is_active"]
    prepopulated_fields = {"slug": ("name",)}

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display  = ["name", "branch", "category", "price", "is_available", "is_featured", "avg_rating"]
    list_filter   = ["branch", "category", "is_available", "is_featured", "dietary_type"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}

@admin.register(ItemCustomisation)
class ItemCustomisationAdmin(admin.ModelAdmin):
    list_display = ["name", "menu_item", "extra_price"]

@admin.register(ItemReview)
class ItemReviewAdmin(admin.ModelAdmin):
    list_display = ["menu_item", "customer", "rating", "is_visible", "created_at"]
    list_filter  = ["is_visible", "rating"]
