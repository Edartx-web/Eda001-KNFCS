"""apps/stock/urls.py"""
from django.urls import path
from apps.stock.views import (
    StockDashboardView, StockTopUpView,
    StockLogView, AcknowledgeAlertsView,
    StockThresholdView, StockCarryoverToggleView,
    StockRejectCarryoverView, StockRollbackView,
    StockLockView, StockActivityView,
    StockHistoryView,
    StockBulkCarryoverView, StockFullResetView,
    SuperAdminActivityLogView,
)

urlpatterns = [
    path("",                   StockDashboardView.as_view(),         name="stock-dashboard"),
    path("topup/",             StockTopUpView.as_view(),             name="stock-topup"),
    path("log/",               StockLogView.as_view(),               name="stock-log"),
    path("alerts/ack/",        AcknowledgeAlertsView.as_view(),      name="ack-alerts"),
    path("threshold/",         StockThresholdView.as_view(),         name="stock-threshold"),
    path("carryover/",         StockCarryoverToggleView.as_view(),   name="stock-carryover"),
    path("reject-carryover/",  StockRejectCarryoverView.as_view(),   name="stock-reject-carryover"),
    path("rollback/",          StockRollbackView.as_view(),          name="stock-rollback"),
    path("lock/",              StockLockView.as_view(),              name="stock-lock"),
    path("activity/",          StockActivityView.as_view(),          name="stock-activity"),
    path("history/",           StockHistoryView.as_view(),           name="stock-history"),
    path("bulk-carryover/",    StockBulkCarryoverView.as_view(),     name="stock-bulk-carryover"),
    path("reset/",             StockFullResetView.as_view(),         name="stock-reset"),
    path("admin-log/",         SuperAdminActivityLogView.as_view(),  name="stock-admin-log"),
]
