"""apps/branches/urls.py"""
from django.urls import path
from apps.branches import views

urlpatterns = [
    path("public/",             views.PublicBranchListView.as_view(),     name="branch-public-list"),
    path("",                    views.BranchListCreateView.as_view(),     name="branch-list-create"),
    path("config/",             views.SiteConfigView.as_view(),           name="site-config"),
    path("spin/",               views.SpinView.as_view(),                 name="spin"),
    path("upload-media/",       views.UploadMediaView.as_view(),          name="upload-media"),
    path("presigned-upload/",   views.PresignedUploadView.as_view(),      name="presigned-upload"),
    path("<uuid:pk>/",          views.BranchDetailView.as_view(),         name="branch-detail"),
    path("<uuid:pk>/hours/",    views.BranchOperatingHoursView.as_view(), name="branch-hours"),
    path("<uuid:pk>/qr/",          views.BranchQRCodeView.as_view(),        name="branch-qr"),
    path("<uuid:pk>/payment-qr/",   views.BranchPaymentQRView.as_view(),      name="branch-payment-qr"),
    path("<uuid:pk>/payment-info/", views.BranchPaymentInfoView.as_view(),    name="branch-payment-info"),
    # Table management + availability
    path("<uuid:pk>/tables/",              views.BranchTableListView.as_view(),   name="branch-tables"),
    path("<uuid:pk>/tables/<uuid:tid>/",   views.BranchTableDetailView.as_view(), name="branch-table-detail"),
]
