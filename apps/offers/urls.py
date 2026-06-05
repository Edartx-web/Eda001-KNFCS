"""apps/offers/urls.py"""
from django.urls import path
from apps.offers.views import (
    # Public / customer
    CouponLookupView,
    ActiveOffersView,
    OfferDetailView,
    WelcomeOfferView,
    # Referral
    ReferralLinkView,
    ReferralTrackView,
    ReferralClaimView,
    ReferralStatsView,
    # Admin
    AdminOfferCreateView,
    AdminOfferUpdateView,
    OfferRedemptionListView,
    AdminReferralStatsView,
    AdminReEngagementPreviewView,
)

urlpatterns = [
    # ── Public / customer ──────────────────────────────────────────────
    path("",                          ActiveOffersView.as_view(),           name="offers-list"),
    path("coupon/",                   CouponLookupView.as_view(),           name="coupon-lookup"),
    path("welcome/",                  WelcomeOfferView.as_view(),           name="welcome-offer"),
    path("<uuid:offer_id>/",          OfferDetailView.as_view(),            name="offer-detail"),

    # ── Referral ───────────────────────────────────────────────────────
    path("referral/link/",            ReferralLinkView.as_view(),           name="referral-link"),
    path("referral/track/",           ReferralTrackView.as_view(),          name="referral-track"),
    path("referral/claim/",           ReferralClaimView.as_view(),          name="referral-claim"),
    path("referral/stats/",           ReferralStatsView.as_view(),          name="referral-stats"),

    # ── Admin ──────────────────────────────────────────────────────────
    path("admin/",                    AdminOfferCreateView.as_view(),       name="offer-create"),
    path("admin/redemptions/",        OfferRedemptionListView.as_view(),    name="offer-redemptions"),
    path("admin/referral-stats/",     AdminReferralStatsView.as_view(),     name="admin-referral-stats"),
    path("admin/reengagement-preview/", AdminReEngagementPreviewView.as_view(), name="reengagement-preview"),
    path("admin/<uuid:offer_id>/",    AdminOfferUpdateView.as_view(),       name="offer-update"),
]
