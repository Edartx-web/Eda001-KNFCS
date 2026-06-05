"""
apps/accounts/serializers.py
All request/response serializers + custom JWT token builder.
"""

from django.conf  import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, Role
from apps.branches.models import Branch


# ── JWT helper ────────────────────────────────────────────────────────────────

def get_tokens_for_user(user):
    """Build JWT pair with custom claims: role, branch_id, name."""
    refresh = RefreshToken.for_user(user)
    refresh["role"]      = user.role
    refresh["branch_id"] = user.branch_id_value
    refresh["name"]      = user.name
    return {
        "refresh": str(refresh),
        "access":  str(refresh.access_token),
    }


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerRegisterSerializer(serializers.Serializer):
    name  = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_phone(self, value):
        value = value.strip().replace(" ", "")
        if not value.startswith("+"):
            raise serializers.ValidationError(
                "Phone must include country code, e.g. +919876543210"
            )
        if len(value) < 10:
            raise serializers.ValidationError("Phone number is too short.")
        return value


class CustomerVerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    otp   = serializers.CharField(max_length=10)

    def validate_phone(self, v):
        v = v.strip().replace(" ", "")
        if v and not v.startswith("+"):
            raise serializers.ValidationError(
                "Phone must include country code, e.g. +919876543210"
            )
        return v

    def validate_otp(self, v): return v.strip()


class CustomerResendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    def validate_phone(self, v): return v.strip().replace(" ", "")


# ── Staff ─────────────────────────────────────────────────────────────────────

class StaffLoginSerializer(serializers.Serializer):
    """
    Frontend sends { user_id, password }.
    user_id maps to user_id_login field.
    """
    user_id  = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        uid = data["user_id"].strip().upper()
        pw  = data["password"]
        try:
            user = User.objects.get(user_id_login=uid, role=Role.STAFF)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid User ID or password.")
        if not user.is_active:
            raise serializers.ValidationError("Account suspended. Contact your admin.")
        if not user.check_password(pw):
            raise serializers.ValidationError("Invalid User ID or password.")
        data["user"] = user
        return data


class StaffVerifyEmailSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    otp          = serializers.CharField(max_length=10)
    new_password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    def validate_email(self, v): return v.strip().lower()
    def validate_otp(self, v):   return v.strip()
    def validate_new_password(self, v):
        if v:
            try:
                validate_password(v)
            except DjangoValidationError as e:
                raise serializers.ValidationError(list(e.messages))
        return v


class StaffForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    def validate_email(self, v): return v.strip().lower()


class StaffResetPasswordSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    otp          = serializers.CharField(max_length=10)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, v):        return v.strip().lower()
    def validate_otp(self, v):          return v.strip()
    def validate_new_password(self, v):
        try:
            validate_password(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminLoginSerializer(serializers.Serializer):
    """Works for both branch_admin and super_admin."""
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"].strip().lower()
        pw    = data["password"]
        try:
            user = User.objects.get(
                email    = email,
                role__in = [Role.BRANCH_ADMIN, Role.SUPER_ADMIN],
            )
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        if not user.check_password(pw):
            raise serializers.ValidationError("Invalid email or password.")
        data["user"] = user
        return data


class CreateBranchAdminSerializer(serializers.Serializer):
    """SuperAdmin creates a Branch Admin.  POST /auth/admin/branch-admins/
    Note: password is auto-generated — do NOT send it from frontend.
    The temp password is emailed to the branch admin.
    """
    name      = serializers.CharField(max_length=150)
    email     = serializers.EmailField()
    branch_id = serializers.UUIDField()

    def validate_name(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError("Name is required.")
        return v

    def validate_email(self, v):
        v = v.strip().lower()
        if User.objects.filter(email=v).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return v

    def validate_branch_id(self, v):
        if not Branch.objects.filter(id=v, is_active=True).exists():
            raise serializers.ValidationError("Branch not found or is inactive.")
        return v

    def validate_password(self, v):
        try:
            validate_password(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v


class CreateStaffSerializer(serializers.Serializer):
    """
    BranchAdmin or SuperAdmin creates a staff member.
    POST /auth/admin/staff/
    """
    name          = serializers.CharField(max_length=150)
    email         = serializers.EmailField()
    user_id_login = serializers.CharField(max_length=50)
    password      = serializers.CharField(write_only=True, min_length=8)
    mobile        = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_name(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError("Name is required.")
        return v

    def validate_email(self, v):
        v = v.strip().lower()
        if User.objects.filter(email=v).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return v

    def validate_user_id_login(self, v):
        v = v.strip().upper()
        if not v:
            raise serializers.ValidationError("User ID is required.")
        if len(v) < 4:
            raise serializers.ValidationError("User ID must be at least 4 characters.")
        if User.objects.filter(user_id_login=v).exists():
            raise serializers.ValidationError("This User ID is already taken.")
        return v

    def validate_password(self, v):
        try:
            validate_password(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v

    def validate_mobile(self, v):
        v = v.strip().replace(" ", "")
        if v and not v.startswith("+"):
            raise serializers.ValidationError(
                "Mobile must include country code, e.g. +919876543210"
            )
        return v


# ── Profile ───────────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "name", "email", "phone", "role",
            "branch_id", "branch_name",
            "is_verified", "is_on_duty", "must_change_password",
            "loyalty_points", "date_joined",
        ]

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None
