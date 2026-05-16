"""apps/accounts/admin.py"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import User, OTPRecord


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ("name", "email", "phone", "user_id_login", "role", "branch", "is_active", "is_verified")
    list_filter     = ("role", "is_active", "is_verified", "branch")
    search_fields   = ("name", "email", "phone", "user_id_login")
    ordering        = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "last_login")

    fieldsets = (
        ("Identity",   {"fields": ("id", "name", "email", "phone", "user_id_login")}),
        ("Role",       {"fields": ("role", "branch")}),
        ("Status",     {"fields": ("is_active", "is_verified", "is_on_duty")}),
        ("Permissions",{"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("date_joined", "last_login")}),
    )

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": (
            "name", "email", "phone", "user_id_login",
            "role", "branch", "password1", "password2",
        )}),
    )


@admin.register(OTPRecord)
class OTPRecordAdmin(admin.ModelAdmin):
    list_display  = ("user", "purpose", "expires_at", "attempts", "is_used")
    list_filter   = ("purpose", "is_used")
    readonly_fields = ("id", "otp_hash", "created_at")
    search_fields   = ("user__name", "user__email", "user__phone")
    fieldsets = (
        (None, {"fields": ("id", "user", "purpose", "otp_hash", "expires_at", "attempts", "is_used", "created_at")}),
    )
from apps.accounts.models import StaffSession

@admin.register(StaffSession)
class StaffSessionAdmin(admin.ModelAdmin):
    list_display  = ("user", "login_at", "logout_at", "duration_minutes", "is_idle", "is_active", "addr")
    list_filter   = ("is_idle", "user__role", "user__branch")
    search_fields = ("user__name", "user__email", "addr")
    readonly_fields = ("id", "login_at", "last_seen")
    ordering = ("-login_at",)
