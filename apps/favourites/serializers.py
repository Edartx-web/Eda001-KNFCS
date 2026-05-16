from rest_framework import serializers
from apps.favourites.models import Favourite


class FavouriteSerializer(serializers.ModelSerializer):
    menu_item_name  = serializers.CharField(source="menu_item.name",  read_only=True)
    menu_item_slug  = serializers.CharField(source="menu_item.slug",  read_only=True)
    menu_item_price = serializers.DecimalField(
        source="menu_item.price", max_digits=8, decimal_places=2, read_only=True
    )
    menu_item_image = serializers.SerializerMethodField()
    menu_item_emoji = serializers.CharField(source="menu_item.emoji", read_only=True)

    class Meta:
        model  = Favourite
        fields = [
            "id", "menu_item", "menu_item_name", "menu_item_slug",
            "menu_item_price", "menu_item_image", "menu_item_emoji",
            "created_at",
        ]

    def get_menu_item_image(self, obj):
        return obj.menu_item.image.url if obj.menu_item.image else None
