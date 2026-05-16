"""apps/offers/urls.py"""
from django.urls import path
from apps.offers.views import (
    CouponLookupView,
    ActiveOffersView, OfferDetailView,
    AdminOfferCreateView, AdminOfferUpdateView,
    OfferRedemptionListView,
)

urlpatterns = [
    # Public — customers
    path("",                          ActiveOffersView.as_view(),          name="offers-list"),
    path("coupon/",                   CouponLookupView.as_view(),          name="coupon-lookup"),
    path("<uuid:offer_id>/",          OfferDetailView.as_view(),           name="offer-detail"),

    # Admin
    path("admin/",                    AdminOfferCreateView.as_view(),      name="offer-create"),
    path("admin/redemptions/",        OfferRedemptionListView.as_view(),   name="offer-redemptions"),
    path("admin/<uuid:offer_id>/",    AdminOfferUpdateView.as_view(),      name="offer-update"),
]
