"""
config/urls.py — Root URL configuration
All API routes versioned under /api/v1/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/",               admin.site.urls),

    # Phase 1 — Auth & Branches
    path("api/v1/auth/",         include("apps.accounts.urls")),
    path("api/v1/branches/",     include("apps.branches.urls")),

    # Phase 2 — Core business logic
    path("api/v1/menu/",         include("apps.menu.urls")),
    path("api/v1/offers/",       include("apps.offers.urls")),
    path("api/v1/orders/",       include("apps.orders.urls")),
    path("api/v1/stock/",        include("apps.stock.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/favourites/",    include("apps.favourites.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
