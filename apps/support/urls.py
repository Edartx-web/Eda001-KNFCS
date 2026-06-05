"""apps/support/urls.py"""
from django.urls import path
from apps.support.views import SubmitTicketView, AdminTicketListView, AdminTicketDetailView

urlpatterns = [
    path("submit/",            SubmitTicketView.as_view(),      name="support-submit"),
    path("tickets/",           AdminTicketListView.as_view(),   name="support-list"),
    path("tickets/<uuid:pk>/", AdminTicketDetailView.as_view(), name="support-detail"),
]
