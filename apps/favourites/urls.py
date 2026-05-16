"""apps/favourites/urls.py — these routes mount under /api/v1/menu/"""
from django.urls import path
from apps.favourites.views import FavouriteToggleView, FavouriteListView

urlpatterns = [
    path("",        FavouriteListView.as_view(),  name="favourites"),
    path("toggle/", FavouriteToggleView.as_view(), name="fav-toggle"),
]
