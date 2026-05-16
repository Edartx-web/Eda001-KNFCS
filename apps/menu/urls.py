"""
apps/menu/urls.py
Public + Admin routes
"""
from django.urls import path
from apps.menu import views
from apps.favourites.views import FavouriteToggleView, FavouriteListView

urlpatterns = [
    # ── Public / Customer ─────────────────────────────────────────────────
    path("categories/",              views.CategoryListView.as_view(),    name="category-list"),
    path("categories/<slug:slug>/",  views.CategoryDetailView.as_view(),  name="category-detail"),
    path("items/",                   views.MenuItemListView.as_view(),     name="item-list"),
    path("items/<slug:slug>/",       views.MenuItemDetailView.as_view(),   name="item-detail"),
    path("featured/",                views.FeaturedItemsView.as_view(),    name="featured"),
    path("search/",                  views.SearchView.as_view(),           name="search"),
    path("reviews/",                 views.SubmitReviewView.as_view(),     name="submit-review"),
    path("favourites/",              FavouriteListView.as_view(),          name="favourites"),
    path("favourites/toggle/",       FavouriteToggleView.as_view(),        name="fav-toggle"),

    # ── Admin CRUD ────────────────────────────────────────────────────────
    path("admin/categories/",
         views.AdminCategoryListCreateView.as_view(),  name="admin-cat-list"),
    path("admin/categories/<uuid:cat_id>/",
         views.AdminCategoryDetailView.as_view(),      name="admin-cat-detail"),
    path("admin/items/",
         views.AdminMenuItemListCreateView.as_view(),  name="admin-item-list"),
    path("admin/items/<uuid:item_id>/",
         views.AdminMenuItemDetailView.as_view(),      name="admin-item-detail"),
    path("admin/items/<uuid:item_id>/toggle/",
         views.AdminToggleAvailabilityView.as_view(),  name="admin-item-toggle"),
    path("admin/reviews/",
         views.AdminReviewListView.as_view(),          name="admin-review-list"),
    path("admin/reviews/<uuid:review_id>/reply/",
         views.AdminReviewReplyView.as_view(),         name="admin-review-reply"),
    path("admin/reviews/<uuid:review_id>/visibility/",
         views.AdminReviewVisibilityView.as_view(),    name="admin-review-visibility"),
]
