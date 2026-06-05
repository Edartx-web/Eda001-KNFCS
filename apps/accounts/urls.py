"""apps/accounts/urls.py — all auth routes under /api/v1/auth/"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView as _BaseRefreshView

class UnthrottledTokenRefreshView(_BaseRefreshView):
    """JWT token refresh — no throttle so axios interceptors don't hit 429."""
    throttle_classes = []
from apps.accounts import views

urlpatterns = [
    # Customer
    path("customer/register/",     views.CustomerRegisterView.as_view(),    name="customer-register"),
    path("customer/verify-otp/",   views.CustomerVerifyOTPView.as_view(),   name="customer-verify-otp"),
    path("customer/resend-otp/",   views.CustomerResendOTPView.as_view(),   name="customer-resend-otp"),

    # Staff
    path("staff/login/",           views.StaffLoginView.as_view(),          name="staff-login"),
    path("staff/verify-email/",    views.StaffVerifyEmailView.as_view(),    name="staff-verify-email"),
    path("staff/resend-otp/",      views.StaffResendOTPView.as_view(),      name="staff-resend-otp"),
    path("staff/forgot-password/", views.StaffForgotPasswordView.as_view(), name="staff-forgot-password"),
    path("staff/reset-password/",  views.StaffResetPasswordView.as_view(),  name="staff-reset-password"),

    # Admin
    path("admin/login/",           views.AdminLoginView.as_view(),          name="admin-login"),
    path("admin/branch-admins/",   views.CreateBranchAdminView.as_view(),   name="create-branch-admin"),
    path("admin/staff/",           views.CreateStaffView.as_view(),         name="create-staff"),

    # Common
    path("me/",                       views.MeView.as_view(),                  name="me"),
    path("token/refresh/",            UnthrottledTokenRefreshView.as_view(),   name="token-refresh"),
    path("change-password/",          views.ChangePasswordView.as_view(),      name="change-password"),
    path("logout/",                   views.LogoutView.as_view(),              name="logout"),
    path("admin/staff-list/",         views.StaffListView.as_view(),           name="staff-list"),
    path("admin/staff-list/<uuid:pk>/", views.StaffDetailView.as_view(),       name="staff-detail"),
    path("sessions/",                 views.StaffSessionListView.as_view(),      name="staff-sessions"),
    path("ping/",                     views.StaffPingView.as_view(),             name="staff-ping"),
    path("admin/users/",              views.SuperAdminUserListView.as_view(),    name="superadmin-users"),
    path("admin/users/<uuid:pk>/",          views.AdminUserDetailView.as_view(),  name="admin-user-detail"),
    path("admin/users/<uuid:pk>/terminate/", views.TerminateUserView.as_view(),   name="terminate-user"),
    path("admin/forgot-password/",    views.AdminForgotPasswordView.as_view(),   name="admin-forgot-password"),
    path("admin/reset-password/",     views.AdminResetPasswordView.as_view(),    name="admin-reset-password"),

    # Public
    path("contact/",                  views.ContactView.as_view(),               name="contact"),
]
