"""
apps/favourites/views.py
Customer favourites — toggle and list.
These views were in menu/views.py but belong here now that Favourite
lives in its own app.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.favourites.models import Favourite
from apps.menu.models import MenuItem
from apps.accounts.permissions import IsCustomer


def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


class FavouriteToggleView(APIView):
    """
    POST /api/v1/menu/favourites/toggle/
    Body: { "menu_item_id": "<uuid>" }
    Adds if not present, removes if already favourited.
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        item_id = request.data.get("menu_item_id")
        if not item_id:
            return err("menu_item_id is required.")

        try:
            item = MenuItem.objects.get(id=item_id)
        except MenuItem.DoesNotExist:
            return err("Menu item not found.")

        fav, created = Favourite.objects.get_or_create(
            customer=request.user,
            menu_item=item,
        )
        if not created:
            fav.delete()
            return ok({"favourited": False, "message": "Removed from favourites."})

        return ok({"favourited": True, "message": "Added to favourites."})


class FavouriteListView(APIView):
    """GET /api/v1/menu/favourites/ — customer's favourite items."""
    permission_classes = [IsCustomer]

    def get(self, request):
        from apps.menu.serializers import MenuItemListSerializer
        favs = Favourite.objects.filter(
            customer=request.user,
        ).select_related("menu_item", "menu_item__category").order_by("-created_at")

        items = [f.menu_item for f in favs if f.menu_item.is_available]
        return ok({"favourites": MenuItemListSerializer(items, many=True).data})
