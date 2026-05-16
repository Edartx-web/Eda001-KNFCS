"""apps/notifications/urls.py"""
from django.urls import path
from . import views

urlpatterns = [
    path("whatsapp/status/",  views.WhatsAppStatusView.as_view(),  name="whatsapp-status"),
    path("whatsapp/logout/",  views.WhatsAppLogoutView.as_view(),  name="whatsapp-logout"),
    path("whatsapp-alert/",   views.WhatsAppAlertView.as_view(),   name="whatsapp-alert"),
    path("broadcast/",                        views.BroadcastView.as_view(),           name="broadcast-list"),
    path("broadcast/force-run-all/",          views.BroadcastForceRunAllView.as_view(), name="broadcast-force-run-all"),
    path("broadcast/<int:pk>/",               views.BroadcastDetailView.as_view(),     name="broadcast-detail"),
    path("broadcast/<int:pk>/retry/",         views.BroadcastRetryView.as_view(),      name="broadcast-retry"),
]
