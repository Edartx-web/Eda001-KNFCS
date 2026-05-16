"""apps/orders/urls.py"""
from django.urls import path
from apps.orders.views import (
    PlaceOrderView, MyOrdersView, OrderDetailView,
    OrderQueueView, UpdateOrderStatusView,
    CompletedOrdersView, AdminOrderListView,
    AnalyticsDashboardView, LoyaltyRedeemView,
    MarkPaymentView, CancelOrderView, CancelReasonsView,
    ExportOrdersCSVView, ExportCustomersCSVView,
    StaffCompletionStatsView, PaymentLogsView,
)

urlpatterns = [
    path("",                               PlaceOrderView.as_view(),           name="place-order"),
    path("my/",                            MyOrdersView.as_view(),             name="my-orders"),
    path("queue/",                         OrderQueueView.as_view(),           name="order-queue"),
    path("completed/",                     CompletedOrdersView.as_view(),      name="completed-orders"),
    path("completion-stats/",             StaffCompletionStatsView.as_view(), name="completion-stats"),
    path("admin/",                         AdminOrderListView.as_view(),       name="admin-orders"),
    path("analytics/",                     AnalyticsDashboardView.as_view(),   name="analytics"),
    path("loyalty/redeem/",                LoyaltyRedeemView.as_view(),        name="loyalty-redeem"),
    path("cancel-reasons/",               CancelReasonsView.as_view(),        name="cancel-reasons"),
    path("payment-logs/",                  PaymentLogsView.as_view(),          name="payment-logs"),
    path("export/csv/",                    ExportOrdersCSVView.as_view(),      name="export-orders-csv"),
    path("export/customers/",             ExportCustomersCSVView.as_view(),   name="export-customers-csv"),
    path("<uuid:order_id>/",               OrderDetailView.as_view(),          name="order-detail"),
    path("<uuid:order_id>/status/",        UpdateOrderStatusView.as_view(),    name="update-status"),
    path("<uuid:order_id>/payment/",       MarkPaymentView.as_view(),          name="mark-payment"),
    path("<uuid:order_id>/cancel/",        CancelOrderView.as_view(),          name="cancel-order"),
]
