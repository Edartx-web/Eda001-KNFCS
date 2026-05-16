"""apps/branches/urls.py"""
from django.urls import path
from apps.branches import views

urlpatterns = [
    path("public/",             views.PublicBranchListView.as_view(),     name="branch-public-list"),
    path("",                    views.BranchListCreateView.as_view(),     name="branch-list-create"),
    path("config/",             views.SiteConfigView.as_view(),           name="site-config"),
    path("spin/",               views.SpinView.as_view(),                 name="spin"),
    path("<uuid:pk>/",          views.BranchDetailView.as_view(),         name="branch-detail"),
    path("<uuid:pk>/hours/",    views.BranchOperatingHoursView.as_view(), name="branch-hours"),
    path("<uuid:pk>/qr/",       views.BranchQRCodeView.as_view(),         name="branch-qr"),
]
