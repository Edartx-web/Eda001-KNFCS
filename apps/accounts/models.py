"""
apps/accounts/models.py

Models:
  User      — Unified auth model for all 4 roles.
              Customers  → phone login
              Staff      → user_id_login
              Admins     → email
  OTPRecord — Secure OTP storage: hashed, expiry, attempts, purpose.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db    import models
from django.utils import timezone
from django.conf  import settings


# ── Role / Purpose constants ──────────────────────────────────────────────────

class Role(models.TextChoices):
    SUPER_ADMIN  = "super_admin",  "Super Admin"
    BRANCH_ADMIN = "branch_admin", "Branch Admin"
    STAFF        = "staff",        "Staff"
    CUSTOMER     = "customer",     "Customer"


class OTPPurpose(models.TextChoices):
    CUSTOMER_REGISTER  = "customer_register",  "Customer Registration"
    STAFF_EMAIL_VERIFY = "staff_email_verify", "Staff Email Verification"
    PASSWORD_RESET     = "password_reset",     "Password Reset"


# ── User manager ──────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):

    def _create(self, role, password=None, **fields):
        fields.setdefault("is_active", True)
        user = self.model(role=role, **fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_customer(self, phone, name, **kw):
        if not phone:
            raise ValueError("Phone is required for customers")
        kw.setdefault("is_verified", False)
        return self._create(Role.CUSTOMER, phone=phone, name=name, **kw)

    def create_staff(self, email, user_id_login, name, branch, password, **kw):
        if not email:
            raise ValueError("Email is required for staff")
        kw.setdefault("is_verified", False)
        return self._create(
            Role.STAFF,
            email         = self.normalize_email(email),
            user_id_login = user_id_login,
            name          = name,
            branch        = branch,
            password      = password,
            **kw,
        )

    def create_branch_admin(self, email, name, branch, password, **kw):
        if not email:
            raise ValueError("Email is required for branch admin")
        kw["is_verified"] = True
        return self._create(
            Role.BRANCH_ADMIN,
            email    = self.normalize_email(email),
            name     = name,
            branch   = branch,
            password = password,
            **kw,
        )

    def create_superadmin(self, email, name, password, **kw):
        if not email:
            raise ValueError("Email is required for super admin")
        kw.update(is_verified=True, is_staff=True, is_superuser=True)
        return self._create(
            Role.SUPER_ADMIN,
            email    = self.normalize_email(email),
            name     = name,
            password = password,
            **kw,
        )

    # Required by Django admin
    def create_superuser(self, email, password, **kw):
        return self.create_superadmin(
            email    = email,
            name     = kw.pop("name", "Super Admin"),
            password = password,
            **kw,
        )


# ── User ─────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    """
    One model for all roles.

    Login identifier:
      customer     → phone
      staff        → user_id_login
      branch_admin → email
      super_admin  → email
    """

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name          = models.CharField(max_length=150)
    email         = models.EmailField(unique=True, null=True, blank=True)
    phone         = models.CharField(max_length=20, unique=True, null=True, blank=True)
    user_id_login = models.CharField(max_length=50, unique=True, null=True, blank=True)
    role          = models.CharField(max_length=20, choices=Role.choices)

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete    = models.SET_NULL,
        null         = True,
        blank        = True,
        related_name = "users",
    )

    is_active    = models.BooleanField(default=True)
    is_verified  = models.BooleanField(default=False)
    is_staff     = models.BooleanField(default=False)   # Django admin access
    is_superuser = models.BooleanField(default=False)
    is_on_duty           = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)  # Force password change on next login
    loyalty_points       = models.PositiveIntegerField(default=0)  # 1pt per ₹10 spent

    # Scheduled shift hours — HH:MM strings, e.g. "09:00", "18:00"
    shift_start = models.CharField(max_length=5, blank=True, default="")
    shift_end   = models.CharField(max_length=5, blank=True, default="")

    # Login location — captured on each login
    last_login_lat  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_login_lng  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_login_addr = models.CharField(max_length=255, blank=True, default="")

    date_joined = models.DateTimeField(default=timezone.now)
    last_login  = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table         = "users"
        verbose_name     = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["user_id_login"]),
            models.Index(fields=["branch", "role"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.role}) — {self.email or self.phone or self.user_id_login}"

    # ── Convenience ───────────────────────────────────────────────────────────
    @property
    def is_customer(self):      return self.role == Role.CUSTOMER
    @property
    def is_staff_member(self):  return self.role == Role.STAFF
    @property
    def is_branch_admin(self):  return self.role == Role.BRANCH_ADMIN
    @property
    def is_super_admin(self):   return self.role == Role.SUPER_ADMIN
    @property
    def is_admin_or_above(self):return self.role in (Role.BRANCH_ADMIN, Role.SUPER_ADMIN)

    @property
    def branch_id_value(self):
        """Safe branch_id for JWT — None for Super Admin."""
        return str(self.branch_id) if self.branch_id else None


# ── StaffSession ───────────────────────────────────────────────────────────────

class StaffSession(models.Model):
    """
    Tracks every login/logout/idle event for staff and branch_admin.
    Used by Branch Admin and Super Admin to monitor:
      - Who logged in, when, from where
      - How long they were active
      - Idle periods (no API calls for > 60 min)
    """
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="staff_sessions",
    )
    login_at   = models.DateTimeField(default=timezone.now)
    logout_at  = models.DateTimeField(null=True, blank=True)
    last_seen  = models.DateTimeField(default=timezone.now)

    # Location at login time (browser geolocation)
    lat  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    addr = models.CharField(max_length=255, blank=True, default="")

    # Computed flag — set by Celery task after 60 min idle
    is_idle    = models.BooleanField(default=False)

    class Meta:
        db_table = "staff_sessions"
        ordering = ["-login_at"]
        indexes  = [
            models.Index(fields=["user", "-login_at"]),
            models.Index(fields=["last_seen"]),
        ]

    def __str__(self):
        return f"{self.user.name} — {self.login_at:%Y-%m-%d %H:%M}"

    @property
    def duration_minutes(self):
        end = self.logout_at or timezone.now()
        return int((end - self.login_at).total_seconds() / 60)

    @property
    def is_active(self):
        if self.logout_at:
            return False
        return (timezone.now() - self.last_seen).total_seconds() < 3600


# ── OTPRecord ─────────────────────────────────────────────────────────────────

class OTPRecord(models.Model):
    """
    One active OTP per user per purpose.
    OTP stored as sha256 hash — never plain text.
    """

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    otp_hash   = models.CharField(max_length=128)
    purpose    = models.CharField(max_length=30, choices=OTPPurpose.choices)
    expires_at = models.DateTimeField()
    attempts   = models.PositiveSmallIntegerField(default=0)
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "otp_records"
        indexes  = [models.Index(fields=["user", "purpose"])]

    def __str__(self):
        return f"OTP[{self.purpose}] for {self.user}"

    @property
    def is_expired(self):   return timezone.now() > self.expires_at
    @property
    def is_exhausted(self): return self.attempts >= settings.OTP_MAX_ATTEMPTS
    @property
    def is_valid(self):     return not self.is_used and not self.is_expired and not self.is_exhausted

    def increment_attempts(self):
        self.attempts += 1
        self.save(update_fields=["attempts"])

    def mark_used(self):
        self.is_used = True
        self.save(update_fields=["is_used"])
