"""
config/urls.py — Root URL configuration
All API routes versioned under /api/v1/
"""
import re
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
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
    path("api/v1/support/",       include("apps.support.urls")),

    # Media files — served directly via Django's static serve view.
    # Works regardless of DEBUG. In production, add Nginx location /media/ for better performance.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
