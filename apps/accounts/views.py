"""
apps/accounts/views.py
All auth API views.

Customer:  CustomerRegisterView, CustomerVerifyOTPView, CustomerResendOTPView
Staff:     StaffLoginView, StaffVerifyEmailView, StaffForgotPasswordView, StaffResetPasswordView
Admin:     AdminLoginView, CreateBranchAdminView, CreateStaffView
Common:    MeView
"""

import logging
from django.conf   import settings
from django.utils  import timezone
from django.core.mail import send_mail

from rest_framework             import status
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import User, Role, OTPPurpose
from apps.accounts.serializers import (
    CustomerRegisterSerializer,
    CustomerVerifyOTPSerializer,
    CustomerResendOTPSerializer,
    StaffLoginSerializer,
    StaffVerifyEmailSerializer,
    StaffForgotPasswordSerializer,
    StaffResetPasswordSerializer,
    AdminLoginSerializer,
    CreateBranchAdminSerializer,
    CreateStaffSerializer,
    UserProfileSerializer,
    get_tokens_for_user,
)
from apps.accounts.permissions import IsSuperAdminOnly, IsAdminOrAbove
from apps.branches.models import Branch
from utils.otp import (
    create_otp_record,
    validate_otp,
    can_resend,
    send_otp_whatsapp,
    send_otp_email,
)

logger = logging.getLogger(__name__)


def _is_console_email() -> bool:
    """True when Django is using the console email backend (dev / no SMTP creds)."""
    return "console" in getattr(settings, "EMAIL_BACKEND", "").lower()


# ── Response helpers ──────────────────────────────────────────────────────────

def ok(data=None, message="", code=status.HTTP_200_OK):
    body = {"success": True}
    if message:
        body["message"] = message
    if data:
        body.update(data)
    return Response(body, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": message}, status=code)


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMER
# ══════════════════════════════════════════════════════════════════════════════

class CustomerRegisterView(APIView):
    """
    POST /api/v1/auth/customer/register/
    { name, phone }

    Creates account on first call. Sends OTP via WhatsApp → SMS fallback.
    Returns: { success, message, is_new_user, [dev_otp in dev mode] }
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []  # Applied below via get_throttles

    def get_throttles(self):
        from apps.accounts.throttles import OTPSendThrottle
        return [OTPSendThrottle()]

    def post(self, request):
        s = CustomerRegisterSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        name  = s.validated_data["name"]
        phone = s.validated_data["phone"]

        # Reject if this phone belongs to a staff or admin account
        conflict = User.objects.filter(phone=phone).exclude(role=Role.CUSTOMER).first()
        if conflict:
            return err(
                "This number is linked to a staff or admin account. "
                "Please use the staff login page instead."
            )

        user, is_new = User.objects.get_or_create(
            phone    = phone,
            role     = Role.CUSTOMER,
            defaults = {"name": name, "is_verified": False},
        )
        if not is_new and user.name != name:
            user.name = name
            user.save(update_fields=["name"])

        # Resend cooldown check
        from apps.accounts.models import OTPRecord
        existing = OTPRecord.objects.filter(
            user=user, purpose=OTPPurpose.CUSTOMER_REGISTER, is_used=False
        ).first()
        if existing:
            allowed, wait = can_resend(existing)
            if not allowed:
                return err(f"Please wait {wait} seconds before requesting a new OTP.")

        otp  = create_otp_record(user, OTPPurpose.CUSTOMER_REGISTER)
        sent = send_otp_whatsapp(phone, otp)

        if not sent and not getattr(settings, "OTP_BYPASS", False):
            logger.error(f"OTP delivery failed: {phone}")
            return err(
                "We couldn't send the OTP to your WhatsApp right now. "
                "Please wait a moment and try again, or contact support.",
                503,
            )

        data = {"is_new_user": is_new}
        if getattr(settings, "OTP_BYPASS", False):
            data["dev_otp"] = otp

        return ok(data, "OTP sent to your phone.")


class CustomerVerifyOTPView(APIView):
    """
    POST /api/v1/auth/customer/verify-otp/
    { phone, otp }

    Verifies OTP → marks user verified → returns JWT tokens + profile.
    Response: { success, tokens: {access, refresh}, user: {...} }
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get_throttles(self):
        from apps.accounts.throttles import OTPVerifyThrottle
        return [OTPVerifyThrottle()]

    def post(self, request):
        s = CustomerVerifyOTPSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        phone = s.validated_data["phone"]
        otp   = s.validated_data["otp"]

        try:
            user = User.objects.get(phone=phone, role=Role.CUSTOMER)
        except User.DoesNotExist:
            return err("No account found. Please register first.")

        if not user.is_active:
            return err("This account has been suspended.")

        ok_flag, message = validate_otp(user, OTPPurpose.CUSTOMER_REGISTER, otp)
        if not ok_flag:
            return err(message)

        user.is_verified = True
        user.last_login  = timezone.now()
        user.save(update_fields=["is_verified", "last_login"])

        return ok({
            "tokens": get_tokens_for_user(user),
            "user":   UserProfileSerializer(user).data,
        }, "Login successful.")


class CustomerResendOTPView(APIView):
    """POST /api/v1/auth/customer/resend-otp/  { phone }"""
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get_throttles(self):
        from apps.accounts.throttles import OTPSendThrottle
        return [OTPSendThrottle()]

    def post(self, request):
        s = CustomerResendOTPSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        phone = s.validated_data["phone"]

        try:
            user = User.objects.get(phone=phone, role=Role.CUSTOMER)
        except User.DoesNotExist:
            return err("No account found with this phone number.")

        from apps.accounts.models import OTPRecord
        existing = OTPRecord.objects.filter(
            user=user, purpose=OTPPurpose.CUSTOMER_REGISTER, is_used=False
        ).first()
        if existing:
            allowed, wait = can_resend(existing)
            if not allowed:
                return err(f"Please wait {wait} seconds before requesting a new OTP.")

        otp  = create_otp_record(user, OTPPurpose.CUSTOMER_REGISTER)
        sent = send_otp_whatsapp(phone, otp)
        if not sent and not getattr(settings, "OTP_BYPASS", False):
            logger.error(f"OTP resend delivery failed: {phone}")
            return err(
                "We couldn't send the OTP to your WhatsApp right now. "
                "Please wait a moment and try again, or contact support.",
                503,
            )

        data = {}
        if getattr(settings, "OTP_BYPASS", False):
            data["dev_otp"] = otp

        return ok(data, "OTP resent to your phone.")


# ══════════════════════════════════════════════════════════════════════════════
# STAFF
# ══════════════════════════════════════════════════════════════════════════════

class StaffLoginView(APIView):
    """
    POST /api/v1/auth/staff/login/
    { user_id, password, lat?, lng?, addr? }
    Response: { success, tokens, user }
    Creates a StaffSession record for activity tracking.

    throttle_classes=[] — exempted from global AnonRateThrottle so staff
    can log in without hitting 429 errors during normal use.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []   # no throttle — staff login is trusted

    def post(self, request):
        s = StaffLoginSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        user = s.validated_data["user"]

        # Unverified staff: send OTP now (on first login attempt) and ask them to verify.
        # OTP is never sent at account-creation time — only triggered here.
        if not user.is_verified:
            otp  = create_otp_record(user, OTPPurpose.STAFF_EMAIL_VERIFY)
            sent = send_otp_email(user.email, otp, OTPPurpose.STAFF_EMAIL_VERIFY)
            channel = "email"
            if not sent and user.phone:
                sent = send_otp_whatsapp(user.phone, otp)
                channel = "whatsapp"
            if not sent:
                logger.error("Staff OTP delivery failed (email+WA) for user=%s email=%s", user.id, user.email)
                return err("Failed to send verification code. Please try again or contact admin.", 503)
            data = {
                "requires_verification": True,
                "email": user.email,
                "otp_channel": channel,
            }
            # Dev: expose OTP when real email can't be delivered (console backend)
            if getattr(settings, "OTP_BYPASS", False) or _is_console_email():
                data["dev_otp"] = otp
            msg = (
                "A verification OTP has been sent to your WhatsApp. Please verify to continue."
                if channel == "whatsapp"
                else "A verification OTP has been sent to your email. Please verify to continue."
            )
            return ok(data, msg)

        now  = timezone.now()
        user.last_login = now

        # Store login location if provided
        lat  = request.data.get("lat")
        lng  = request.data.get("lng")
        addr = request.data.get("addr", "")
        if lat and lng:
            try:
                user.last_login_lat  = float(lat)
                user.last_login_lng  = float(lng)
                user.last_login_addr = str(addr)[:255]
            except (ValueError, TypeError):
                pass

        user.save(update_fields=["last_login", "last_login_lat", "last_login_lng", "last_login_addr"])

        ip_address = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("HTTP_X_REAL_IP", "")
            or request.META.get("REMOTE_ADDR", "")
        )

        from apps.accounts.models import StaffSession
        session = StaffSession.objects.create(
            user=user,
            login_at=now,
            lat=user.last_login_lat,
            lng=user.last_login_lng,
            addr=user.last_login_addr or ip_address,
        )

        return ok({
            "tokens":     get_tokens_for_user(user),
            "user":       UserProfileSerializer(user).data,
            "session_id": str(session.id),
        }, "Login successful.")


class StaffVerifyEmailView(APIView):
    """
    POST /api/v1/auth/staff/verify-email/
    { email, otp, new_password }
    Verifies email OTP and sets the staff member's own password in one step.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def post(self, request):
        s = StaffVerifyEmailSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        email    = s.validated_data["email"]
        otp      = s.validated_data["otp"]
        new_pass = s.validated_data.get("new_password", "").strip()

        try:
            user = User.objects.get(email__iexact=email, role=Role.STAFF)
        except User.DoesNotExist:
            return err("No staff account found with this email.")

        if user.is_verified:
            return ok(message="Account already verified. Please login.")

        ok_flag, message = validate_otp(user, OTPPurpose.STAFF_EMAIL_VERIFY, otp)
        if not ok_flag:
            logger.warning(f"verify-email failed: user={user.id} email={email} reason={message!r}")
            return err(message)

        if not new_pass:
            return err("Please set a password to complete your account setup.")

        user.is_verified = True
        user.set_password(new_pass)
        user.save(update_fields=["is_verified", "password"])
        logger.info(f"Staff account activated: user={user.id} email={email}")
        return ok(message="Account verified and password set. You can now login.")


class StaffResendOTPView(APIView):
    """
    POST /api/v1/auth/staff/resend-otp/
    { email }
    Sends (or resends) the verification OTP for an unverified staff account.
    Called from the verify-email page when staff hasn't received their OTP.
    Always returns 200 to prevent email enumeration.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return err("Email address is required.")

        try:
            user = User.objects.get(email=email, role=Role.STAFF, is_active=True)
            if user.is_verified:
                return ok(message="Account is already verified. Please login.")

            from apps.accounts.models import OTPRecord
            # Clean up expired records first so they don't block resend
            OTPRecord.objects.filter(
                user=user, purpose=OTPPurpose.STAFF_EMAIL_VERIFY,
                is_used=False, expires_at__lt=timezone.now()
            ).delete()

            existing = OTPRecord.objects.filter(
                user=user, purpose=OTPPurpose.STAFF_EMAIL_VERIFY, is_used=False
            ).first()
            if existing:
                allowed, wait = can_resend(existing)
                if not allowed:
                    return err(f"Please wait {wait} seconds before requesting a new code.")

            otp  = create_otp_record(user, OTPPurpose.STAFF_EMAIL_VERIFY)
            sent = send_otp_email(user.email, otp, OTPPurpose.STAFF_EMAIL_VERIFY)
            channel = "email"
            if not sent and user.phone:
                sent = send_otp_whatsapp(user.phone, otp)
                channel = "whatsapp"
            if not sent:
                logger.error("Staff resend OTP failed (email+WA) for user=%s email=%s", user.id, user.email)
                return err("Failed to send verification code. Check email config or contact admin.", 503)

            data = {}
            if getattr(settings, "OTP_BYPASS", False) or _is_console_email():
                data["dev_otp"] = otp
            return ok(data, (
                "Verification OTP sent to your WhatsApp."
                if channel == "whatsapp"
                else "Verification OTP sent to your email."
            ))
        except User.DoesNotExist:
            pass  # Silent — prevent enumeration

        return ok(message="If a staff account exists for this email, an OTP has been sent.")


class StaffForgotPasswordView(APIView):
    """
    POST /api/v1/auth/staff/forgot-password/
    { email }
    Always returns 200 (prevents email enumeration).
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def post(self, request):
        s = StaffForgotPasswordSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        email = s.validated_data["email"]
        try:
            user = User.objects.get(email=email, role=Role.STAFF, is_active=True)
            otp  = create_otp_record(user, OTPPurpose.PASSWORD_RESET)
            sent = send_otp_email(email, otp, OTPPurpose.PASSWORD_RESET)
            if not sent and user.phone:
                sent = send_otp_whatsapp(user.phone, otp)
            if not sent:
                logger.error("Password reset delivery failed (email+WA) for user=%s email=%s", user.id, email)
                return err("Failed to send reset code. Please try again or contact admin.", 503)
            if _is_console_email():
                return ok({"dev_otp": otp}, "Reset OTP sent (console backend — check terminal).")
        except User.DoesNotExist:
            pass  # Silent — prevents enumeration

        return ok(message="If an account exists for this email, a reset OTP has been sent.")


class StaffResetPasswordView(APIView):
    """
    POST /api/v1/auth/staff/reset-password/
    { email, otp, new_password }
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def post(self, request):
        s = StaffResetPasswordSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        email    = s.validated_data["email"]
        otp      = s.validated_data["otp"]
        new_pass = s.validated_data["new_password"]

        try:
            user = User.objects.get(email=email, role=Role.STAFF, is_active=True)
        except User.DoesNotExist:
            return err("No active staff account found with this email.")

        ok_flag, message = validate_otp(user, OTPPurpose.PASSWORD_RESET, otp)
        if not ok_flag:
            return err(message)

        user.set_password(new_pass)
        user.save(update_fields=["password"])
        return ok(message="Password reset successful. Please login with your new password.")


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════════════════════

class AdminLoginView(APIView):
    """
    POST /api/v1/auth/admin/login/
    { email, password }
    Works for both branch_admin and super_admin.

    throttle_classes=[] — explicitly exempted from the global AnonRateThrottle
    (100/day) so branch admins and super admins can log in freely.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []   # no throttle — admin logins are trusted

    def post(self, request):
        s = AdminLoginSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        user = s.validated_data["user"]
        now = timezone.now()
        user.last_login = now

        lat  = request.data.get("lat")
        lng  = request.data.get("lng")
        addr = request.data.get("addr", "")
        if lat and lng:
            try:
                user.last_login_lat  = float(lat)
                user.last_login_lng  = float(lng)
                user.last_login_addr = str(addr)[:255]
            except (ValueError, TypeError):
                pass

        user.save(update_fields=["last_login", "last_login_lat", "last_login_lng", "last_login_addr"])

        # Record login session for branch_admin (mirrors StaffSession tracking)
        if user.role == Role.BRANCH_ADMIN:
            from apps.accounts.models import StaffSession
            ip_address = (
                request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                or request.META.get("HTTP_X_REAL_IP", "")
                or request.META.get("REMOTE_ADDR", "")
            )
            StaffSession.objects.create(
                user=user,
                login_at=now,
                lat=user.last_login_lat,
                lng=user.last_login_lng,
                addr=user.last_login_addr or ip_address,
            )

        return ok({
            "tokens": get_tokens_for_user(user),
            "user":   UserProfileSerializer(user).data,
        }, "Login successful.")


class CreateBranchAdminView(APIView):
    """
    POST /api/v1/auth/admin/branch-admins/
    { name, email, password, branch_id }
    SuperAdmin only.
    Creates a Branch Admin, sends welcome email.
    Response: { success, user, message }
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]

    def post(self, request):
        s = CreateBranchAdminSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        data   = s.validated_data
        branch = Branch.objects.get(id=data["branch_id"])

        # Auto-generate a secure temporary password
        import secrets, string
        alphabet = string.ascii_letters + string.digits + "!@#$"
        temp_password = (
            secrets.choice(string.ascii_uppercase) +
            secrets.choice(string.ascii_lowercase) +
            secrets.choice(string.digits) +
            secrets.choice("!@#$") +
            "".join(secrets.choice(alphabet) for _ in range(6))
        )

        user = User.objects.create_branch_admin(
            email    = data["email"],
            name     = data["name"],
            branch   = branch,
            password = temp_password,
        )

        # Force password change on first login
        user.must_change_password = True
        user.save(update_fields=["must_change_password"])

        # Welcome email with HTML template
        try:
            from apps.accounts.email_utils import send_branch_admin_welcome
            send_branch_admin_welcome(
                to=user.email, name=user.name,
                email=user.email, password=temp_password, branch=branch.name,
            )
        except Exception as e:
            logger.warning(f"Welcome email failed for {user.email}: {e}")

        return ok(
            {"user": UserProfileSerializer(user).data},
            "Branch Admin account created successfully.",
            code=status.HTTP_201_CREATED,
        )


class CreateStaffView(APIView):
    """
    POST /api/v1/auth/admin/staff/
    { name, email, user_id_login, password, mobile?, branch_id? }

    BranchAdmin → branch taken from their own branch
    SuperAdmin  → must provide branch_id in body
    Creates staff, sends email verification OTP.
    Response: { success, user, message }
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request):
        s = CreateStaffSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        data = s.validated_data

        # Resolve branch
        if request.user.role == Role.BRANCH_ADMIN:
            branch = request.user.branch
        else:
            branch_id = request.data.get("branch_id")
            if not branch_id:
                return err("branch_id is required when creating staff as Super Admin.")
            try:
                branch = Branch.objects.get(id=branch_id, is_active=True)
            except Branch.DoesNotExist:
                return err("Branch not found.")

        user = User.objects.create_staff(
            email         = data["email"],
            user_id_login = data["user_id_login"],
            name          = data["name"],
            branch        = branch,
            password      = data["password"],
        )

        # Optional mobile
        if data.get("mobile"):
            user.phone = data["mobile"]
            user.save(update_fields=["phone"])

        # Send welcome email with credentials
        try:
            from apps.accounts.email_utils import send_staff_welcome
            send_staff_welcome(
                to=user.email, name=user.name,
                user_id=user.user_id_login,
                password=data["password"],
                branch=branch.name if branch else "—",
            )
        except Exception:
            pass

        return ok(
            {"user": UserProfileSerializer(user).data},
            f"Staff account created for {user.name}. They must verify their email on first login.",
            code=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET /api/v1/auth/me/  — Returns current user profile."""
    permission_classes = [IsAuthenticated]
    throttle_classes   = []   # called on every page load — must not throttle

    def get(self, request):
        return ok({"user": UserProfileSerializer(request.user).data})

    def patch(self, request):
        """PATCH /auth/me/ — update is_on_duty and other profile fields."""
        user   = request.user
        fields = []
        if "is_on_duty" in request.data:
            user.is_on_duty = bool(request.data["is_on_duty"])
            fields.append("is_on_duty")
        if "name" in request.data:
            user.name = request.data["name"]
            fields.append("name")
        if fields:
            user.save(update_fields=fields)
        return ok({"user": UserProfileSerializer(user).data})


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    { current_password, new_password }
    Changes the user's password and clears must_change_password flag.
    Works for all authenticated roles.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new_pw  = request.data.get("new_password", "")

        if not current or not new_pw:
            return Response(
                {"success": False, "error": "Both current_password and new_password are required."},
                status=400,
            )

        if not request.user.check_password(current):
            return Response(
                {"success": False, "error": "Current password is incorrect."},
                status=400,
            )

        if len(new_pw) < 8:
            return Response(
                {"success": False, "error": "New password must be at least 8 characters."},
                status=400,
            )

        if current == new_pw:
            return Response(
                {"success": False, "error": "New password must be different from current password."},
                status=400,
            )

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(new_pw, request.user)
        except DjangoValidationError as e:
            return Response(
                {"success": False, "error": " ".join(e.messages)},
                status=400,
            )

        request.user.set_password(new_pw)
        request.user.must_change_password = False
        request.user.save(update_fields=["password", "must_change_password"])

        return Response({
            "success": True,
            "message": "Password changed successfully. Please log in again.",
        })


class StaffListView(APIView):
    """
    GET  /api/v1/auth/admin/staff-list/
    BranchAdmin → staff for their branch
    SuperAdmin  → ?branch_id= param, or all if omitted

    DELETE /api/v1/auth/admin/staff-list/<user_id>/
    Deactivate a staff account.

    PATCH  /api/v1/auth/admin/staff-list/<user_id>/toggle/
    Toggle is_on_duty for a staff member.
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        if request.user.role == Role.SUPER_ADMIN:
            branch_id = request.query_params.get("branch_id")
            if branch_id:
                qs = User.objects.filter(role=Role.STAFF, branch_id=branch_id)
            else:
                qs = User.objects.filter(role=Role.STAFF)
        else:
            qs = User.objects.filter(role=Role.STAFF, branch=request.user.branch)

        staff = qs.select_related("branch").order_by("name")
        data = [{
            "id":           str(u.id),
            "name":         u.name,
            "email":        u.email or "",
            "user_id_login":u.user_id_login or "",
            "phone":        u.phone or "",
            "branch_id":    str(u.branch_id) if u.branch_id else None,
            "branch_name":  u.branch.name if u.branch else "—",
            "is_active":    u.is_active,
            "is_verified":  u.is_verified,
            "is_on_duty":   u.is_on_duty,
            "shift_start":  u.shift_start or "",
            "shift_end":    u.shift_end or "",
            "date_joined":  u.date_joined.isoformat() if u.date_joined else None,
            "last_login":   u.last_login.isoformat() if u.last_login else None,
        } for u in staff]

        return Response({"success": True, "staff": data, "count": len(data)})


class StaffDetailView(APIView):
    """
    PATCH  /api/v1/auth/admin/staff-list/<pk>/  — update (toggle active/duty)
    DELETE /api/v1/auth/admin/staff-list/<pk>/  — deactivate account
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def _get_staff(self, pk, request):
        from apps.accounts.models import Role
        try:
            u = User.objects.get(id=pk, role=Role.STAFF)
        except (User.DoesNotExist, ValueError):
            return None
        # BranchAdmin can only manage own branch staff
        if request.user.role == Role.BRANCH_ADMIN:
            if str(u.branch_id) != str(request.user.branch_id):
                return None
        return u

    def patch(self, request, pk):
        staff = self._get_staff(pk, request)
        if not staff:
            return Response({"success": False, "error": "Staff not found."}, status=404)

        updated = []
        if "is_active" in request.data:
            staff.is_active = bool(request.data["is_active"])
            updated.append("is_active")
            # When deactivating, always force off-duty
            if not staff.is_active:
                staff.is_on_duty = False
                if "is_on_duty" not in updated:
                    updated.append("is_on_duty")
        if "is_on_duty" in request.data:
            # Cannot go on duty if inactive
            if not staff.is_active:
                staff.is_on_duty = False
            else:
                staff.is_on_duty = bool(request.data["is_on_duty"])
            if "is_on_duty" not in updated:
                updated.append("is_on_duty")

        # Shift schedule — simple HH:MM strings
        for field in ("shift_start", "shift_end"):
            if field in request.data:
                val = str(request.data[field]).strip()[:5]
                setattr(staff, field, val)
                updated.append(field)

        if updated:
            staff.save(update_fields=updated)

        return Response({
            "success": True,
            "message": "Staff updated.",
            "is_active":   staff.is_active,
            "is_on_duty":  staff.is_on_duty,
            "shift_start": staff.shift_start,
            "shift_end":   staff.shift_end,
        })

    def delete(self, request, pk):
        staff = self._get_staff(pk, request)
        if not staff:
            return Response({"success": False, "error": "Staff not found."}, status=404)
        name = staff.name
        staff.is_active = False
        staff.save(update_fields=["is_active"])
        return Response({"success": True, "message": f"{name}'s account has been deactivated."})


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Marks staff/branch_admin as off-duty, closes StaffSession.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = []   # called on every page load — must not throttle

    def post(self, request):
        user = request.user
        fields = []
        if user.role in ("staff", "branch_admin"):
            user.is_on_duty = False
            fields.append("is_on_duty")
        if fields:
            user.save(update_fields=fields)

        # Close the most recent open session
        from apps.accounts.models import StaffSession
        session = StaffSession.objects.filter(user=user, logout_at__isnull=True).order_by("-login_at").first()
        if session:
            session.logout_at = timezone.now()
            session.save(update_fields=["logout_at"])

        return ok({"message": "Logged out."})


class StaffSessionListView(APIView):
    """
    GET /api/v1/auth/sessions/
    Branch Admin / Super Admin sees all staff sessions for their branch.
    Returns login time, logout time, duration, location, idle flag.
    """
    permission_classes = [IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        from apps.accounts.models import StaffSession, Role
        from apps.accounts.permissions import get_request_branch_id

        if request.user.role == Role.SUPER_ADMIN:
            qs = StaffSession.objects.select_related("user", "user__branch").order_by("-login_at")
            branch_id_param = request.query_params.get("branch_id")
            if branch_id_param:
                qs = qs.filter(user__branch_id=branch_id_param)
            role_param = request.query_params.get("role")
            if role_param:
                qs = qs.filter(user__role=role_param)
            date_from_param = request.query_params.get("date_from")
            if date_from_param:
                try:
                    from datetime import date as _date
                    df = _date.fromisoformat(date_from_param)
                    qs = qs.filter(login_at__date__gte=df)
                except ValueError:
                    pass
            qs = qs[:500]
        else:
            branch_id = get_request_branch_id(request)
            qs = StaffSession.objects.filter(
                user__branch_id=branch_id
            ).select_related("user", "user__branch").order_by("-login_at")[:200]

        data = [{
            "id":               str(s.id),
            "staff_name":       s.user.name,
            "staff_id":         s.user.user_id_login or s.user.email or "",
            "staff_role":       s.user.role,
            "branch_name":      s.user.branch.name if s.user.branch else "—",
            "login_at":         s.login_at.isoformat(),
            "logout_at":        s.logout_at.isoformat() if s.logout_at else None,
            "last_seen":        s.last_seen.isoformat(),
            "duration_minutes": s.duration_minutes,
            "is_active":        s.is_active,
            "is_idle":          s.is_idle,
            "lat":              float(s.lat) if s.lat else None,
            "lng":              float(s.lng) if s.lng else None,
            "addr":             s.addr,
        } for s in qs]

        return Response({"success": True, "sessions": data, "count": len(data)})


class StaffPingView(APIView):
    """
    POST /api/v1/auth/ping/
    Called every 5 minutes by any authenticated staff page.
    Updates last_seen on the current session → prevents idle flag.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = []   # called on every page load — must not throttle

    def post(self, request):
        from apps.accounts.models import StaffSession
        now = timezone.now()
        session = StaffSession.objects.filter(
            user=request.user, logout_at__isnull=True
        ).order_by("-login_at").first()
        if session:
            session.last_seen = now
            session.is_idle   = False
            session.save(update_fields=["last_seen", "is_idle"])
        return Response({"success": True, "last_seen": now.isoformat()})


class SuperAdminUserListView(APIView):
    """
    GET /api/v1/auth/admin/users/
    SuperAdmin only — lists ALL users across all roles and branches.
    Supports ?role=customer|staff|branch_admin filter and ?search=
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]
    throttle_classes   = []

    def get(self, request):
        from apps.accounts.models import User, Role
        if request.user.role != Role.SUPER_ADMIN:
            return err("SuperAdmin access required.", 403)

        role_filter = request.query_params.get("role")
        search      = request.query_params.get("search", "").strip()

        qs = User.objects.select_related("branch").order_by("role", "name")
        if role_filter and role_filter in [r.value for r in Role]:
            qs = qs.filter(role=role_filter)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        data = [{
            "id":            str(u.id),
            "name":          u.name,
            "email":         u.email or "",
            "phone":         u.phone or "",
            "role":          u.role,
            "branch_name":   u.branch.name if u.branch else "—",
            "is_active":     u.is_active,
            "is_on_duty":    u.is_on_duty,
            "loyalty_points":u.loyalty_points,
            "date_joined":   u.date_joined.isoformat() if u.date_joined else None,
            "last_login":    u.last_login.isoformat() if u.last_login else None,
            "user_id_login": u.user_id_login or "",
        } for u in qs]

        return Response({"success": True, "users": data, "count": len(data)})


class AdminUserDetailView(APIView):
    """
    PATCH  /api/v1/auth/admin/users/<pk>/  — toggle is_active for a branch_admin
    DELETE /api/v1/auth/admin/users/<pk>/  — deactivate a branch_admin account
    SuperAdmin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]

    def _get(self, pk):
        try:
            return User.objects.get(id=pk, role=Role.BRANCH_ADMIN)
        except (User.DoesNotExist, ValueError):
            return None

    def patch(self, request, pk):
        u = self._get(pk)
        if not u:
            return err("Branch Admin not found.", 404)
        if "is_active" in request.data:
            u.is_active = bool(request.data["is_active"])
            u.save(update_fields=["is_active"])
        return ok({"message": f"{u.name} updated.", "is_active": u.is_active})

    def delete(self, request, pk):
        u = self._get(pk)
        if not u:
            return err("Branch Admin not found.", 404)
        name = u.name
        u.is_active = False
        u.save(update_fields=["is_active"])
        return ok({"message": f"{name}'s account has been deactivated."})


class TerminateUserView(APIView):
    """
    DELETE /api/v1/auth/admin/users/<pk>/terminate/
    SuperAdmin only.  Permanently terminates a staff or branch_admin account.
    Anonymises all PII so referential integrity is preserved (orders, logs, etc.
    still exist but are no longer linked to a real identity).
    This is irreversible.
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]

    def delete(self, request, pk):
        try:
            user = User.objects.get(
                id=pk, role__in=[Role.STAFF, Role.BRANCH_ADMIN]
            )
        except (User.DoesNotExist, ValueError):
            return err("User not found.", 404)

        if user == request.user:
            return err("You cannot terminate your own account.", 400)

        saved_name    = user.name or "Unknown"
        saved_user_id = user.user_id_login or str(user.id)[:8]

        # Anonymise PII — preserve the row so FK references don't break
        uid = str(user.id)[:8]
        user.name          = "[Terminated]"
        user.email         = f"terminated_{uid}@knfc.internal" if user.email else None
        user.phone         = None
        user.user_id_login = f"TRM_{uid}" if user.user_id_login else None
        user.is_active     = False
        user.is_verified   = False
        user.set_unusable_password()
        user.save()

        return ok({
            "message": (
                f"Account for {saved_name} ({saved_user_id}) has been permanently "
                "terminated. Their work history is preserved but all personal data "
                "has been removed."
            )
        })


class AdminForgotPasswordView(APIView):
    """
    POST /api/v1/auth/admin/forgot-password/
    { email }
    Works for branch_admin and super_admin roles.
    Always returns 200 to prevent email enumeration.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []

    def post(self, request):
        from apps.accounts.models import OTPPurpose
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return err("Email address is required.")

        try:
            user = User.objects.get(
                email__iexact=email,
                role__in=[Role.BRANCH_ADMIN, Role.SUPER_ADMIN],
                is_active=True,
            )
            otp = create_otp_record(user, OTPPurpose.PASSWORD_RESET)
            send_otp_email(email, otp, OTPPurpose.PASSWORD_RESET)
        except User.DoesNotExist:
            pass  # Silent — prevents enumeration

        return ok(message="If an admin account exists for this email, a password reset OTP has been sent.")


class AdminResetPasswordView(APIView):
    """
    POST /api/v1/auth/admin/reset-password/
    { email, otp, new_password }
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []

    def post(self, request):
        from apps.accounts.models import OTPPurpose
        email    = (request.data.get("email") or "").strip().lower()
        otp_code = (request.data.get("otp") or "").strip()
        new_pass = request.data.get("new_password", "")

        if not email or not otp_code or not new_pass:
            return err("email, otp, and new_password are required.")

        if len(new_pass) < 8:
            return err("Password must be at least 8 characters.")

        try:
            user = User.objects.get(
                email__iexact=email,
                role__in=[Role.BRANCH_ADMIN, Role.SUPER_ADMIN],
                is_active=True,
            )
        except User.DoesNotExist:
            return err("No admin account found with this email.")

        ok_flag, message = validate_otp(user, OTPPurpose.PASSWORD_RESET, otp_code)
        if not ok_flag:
            return err(message)

        user.set_password(new_pass)
        user.save(update_fields=["password"])
        return ok(message="Password reset successful. Please log in with your new password.")


class ContactView(APIView):
    """
    POST /api/v1/auth/contact/
    { name, email, subject, message }
    Public endpoint — sends the contact form message to the site inbox via SMTP.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []
    throttle_classes   = []

    def post(self, request):
        name    = (request.data.get("name",    "") or "").strip()
        email   = (request.data.get("email",   "") or "").strip()
        subject = (request.data.get("subject", "") or "").strip()
        message = (request.data.get("message", "") or "").strip()

        if not name or not email or not message:
            return err("Name, email, and message are required.")

        if "@" not in email:
            return err("Please provide a valid email address.")

        inbox = getattr(settings, "EMAIL_HOST_USER", None) or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        if not inbox:
            logger.error("ContactView: no recipient email configured (EMAIL_HOST_USER / DEFAULT_FROM_EMAIL).")
            return err("Contact service is not configured. Please try again later.", 503)

        full_subject = f"[KNFC Contact] {subject or 'Website Enquiry'} — from {name}"
        body = (
            f"Name:    {name}\n"
            f"Email:   {email}\n"
            f"Subject: {subject or 'Website Enquiry'}\n"
            f"\n{message}"
        )

        try:
            send_mail(
                subject       = full_subject,
                message       = body,
                from_email    = settings.DEFAULT_FROM_EMAIL,
                recipient_list= [inbox],
                fail_silently = False,
            )
            logger.info(f"Contact form email sent from {email} → {inbox}")
            return ok(message="Your message has been sent. We'll get back to you soon!")
        except Exception as exc:
            logger.error(f"Contact form email failed: {exc}")
            return err("Failed to send your message. Please try again later.", 500)


# ══════════════════════════════════════════════════════════════════════════════
# ONE-TIME DATA RESET  (super_admin only + secret token)
# Remove this view and its URL entry after the reset is done.
# ══════════════════════════════════════════════════════════════════════════════

class ResetTransactionalDataView(APIView):
    """
    POST /api/v1/auth/admin/reset-data/
    { "secret": "<RESET_SECRET value from env>" }

    Deletes all transactional data (users except super_admin, OTPs, orders,
    reviews, notifications, offers, favourites, support tickets) and purges
    Supabase S3 files under reviews/ and support/.

    Protected by:
      1. IsAuthenticated + IsSuperAdminOnly  — must be logged in as super_admin
      2. RESET_SECRET env var match          — extra key prevents accidental calls
    """
    permission_classes = [IsAuthenticated, IsSuperAdminOnly]
    throttle_classes   = []

    def post(self, request):
        secret = getattr(settings, "RESET_SECRET", "")
        if not secret:
            return err("RESET_SECRET is not configured on this server.", 500)

        provided = (request.data.get("secret") or "").strip()
        if not provided or provided != secret:
            return err("Invalid or missing secret.", 403)

        counts  = self._delete_db()
        s3_rows = self._purge_s3()

        return ok({
            "db":      {label: n for label, n in counts},
            "storage": {label: n for label, n in s3_rows},
        }, "Transactional data reset complete.")

    # ── DB ────────────────────────────────────────────────────────────────────

    def _delete_db(self):
        from apps.accounts.models import OTPRecord, StaffSession
        from apps.orders.models import Order, OrderItem
        from apps.menu.models import ItemReview
        from apps.notifications.models import BroadcastLog
        from apps.offers.models import (
            OfferRedemption, ReferralLink, ReferralUsage, ReEngagementLog,
        )
        from apps.favourites.models import Favourite
        from apps.support.models import SupportTicket

        results = []

        def _del(label, qs):
            n, _ = qs.delete()
            results.append((label, n))
            logger.info("Reset: deleted %d %s", n, label)

        _del("OTPRecord",              OTPRecord.objects.all())
        _del("StaffSession",           StaffSession.objects.all())
        _del("BroadcastLog",           BroadcastLog.objects.all())
        _del("OfferRedemption",        OfferRedemption.objects.all())
        _del("ReferralUsage",          ReferralUsage.objects.all())
        _del("ReferralLink",           ReferralLink.objects.all())
        _del("ReEngagementLog",        ReEngagementLog.objects.all())
        _del("Favourite",              Favourite.objects.all())
        _del("SupportTicket",          SupportTicket.objects.all())
        _del("ItemReview",             ItemReview.objects.all())
        _del("OrderItem",              OrderItem.objects.all())
        _del("Order",                  Order.objects.all())
        _del("User_non_superadmin",    User.objects.exclude(role=Role.SUPER_ADMIN))

        return results

    # ── S3 ────────────────────────────────────────────────────────────────────

    def _purge_s3(self):
        endpoint   = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        access_key = getattr(settings, "AWS_ACCESS_KEY_ID", "")
        secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", "")
        bucket     = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        region     = getattr(settings, "AWS_S3_REGION_NAME", "ap-southeast-2")

        if not all([endpoint, access_key, secret_key, bucket]):
            return [("storage_skipped", 0)]

        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            return [("boto3_missing", 0)]

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4"),
        )

        results = []
        for prefix in ["reviews/", "support/"]:
            deleted = 0
            token   = None
            while True:
                kw = {"Bucket": bucket, "Prefix": prefix, "MaxKeys": 1000}
                if token:
                    kw["ContinuationToken"] = token
                try:
                    resp = s3.list_objects_v2(**kw)
                except Exception as exc:
                    logger.error("S3 list error %s: %s", prefix, exc)
                    break
                objs = resp.get("Contents", [])
                if objs:
                    s3.delete_objects(
                        Bucket=bucket,
                        Delete={"Objects": [{"Key": o["Key"]} for o in objs]},
                    )
                    deleted += len(objs)
                if not resp.get("IsTruncated"):
                    break
                token = resp.get("NextContinuationToken")
            results.append((f"s3:{prefix}", deleted))

        return results
