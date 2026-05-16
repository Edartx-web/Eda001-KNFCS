from django.contrib import admin
from apps.favourites.models import Favourite

@admin.register(Favourite)
class FavouriteAdmin(admin.ModelAdmin):
    list_display  = ["customer", "menu_item", "created_at"]
    list_filter   = ["created_at"]
    search_fields = ["customer__name", "menu_item__name"]
    raw_id_fields = ["customer", "menu_item"]
