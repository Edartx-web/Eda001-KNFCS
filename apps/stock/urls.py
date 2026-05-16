"""apps/stock/urls.py"""
from django.urls import path
from apps.stock.views import (
    StockHistoryView,
    StockDashboardView, StockTopUpView,
    StockLogView, AcknowledgeAlertsView,
    StockThresholdView, StockCarryoverToggleView,
)

urlpatterns = [
    path("",              StockDashboardView.as_view(),        name="stock-dashboard"),
    path("topup/",        StockTopUpView.as_view(),             name="stock-topup"),
    path("log/",          StockLogView.as_view(),               name="stock-log"),
    path("alerts/ack/",   AcknowledgeAlertsView.as_view(),     name="ack-alerts"),
    path("threshold/",    StockThresholdView.as_view(),         name="stock-threshold"),
    path("carryover/",    StockCarryoverToggleView.as_view(),   name="stock-carryover"),
    path("history/",      StockHistoryView.as_view(),             name="stock-history"),
]
