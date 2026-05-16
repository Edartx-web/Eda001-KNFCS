"""
apps/accounts/permissions.py — Custom DRF permission classes + helpers.
"""
from rest_framework.permissions import BasePermission
from apps.accounts.models import Role


# ── Role permission classes ───────────────────────────────────────────────────

class IsCustomer(BasePermission):
    message = "Only customers can access this resource."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.CUSTOMER)


class IsStaff(BasePermission):
    message = "Only staff members can access this resource."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.STAFF)


class IsBranchAdmin(BasePermission):
    message = "Only branch admins can access this resource."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.BRANCH_ADMIN)


class IsSuperAdmin(BasePermission):
    message = "Only super admins can access this resource."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPER_ADMIN)


class IsStaffOrAbove(BasePermission):
    message = "Staff or admin access required."
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in (Role.STAFF, Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
        )


class IsAdminOrAbove(BasePermission):
    message = "Admin access required."
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role in (Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
        )


class IsSuperAdminOnly(BasePermission):
    message = "Super admin access required."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPER_ADMIN)


class IsSameBranch(BasePermission):
    """Super Admin bypasses. All others must match their branch_id."""
    message = "You do not have permission to access this branch's data."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == Role.SUPER_ADMIN:
            return True
        return request.user.branch_id is not None

    def has_object_permission(self, request, view, obj):
        if request.user.role == Role.SUPER_ADMIN:
            return True
        obj_branch_id = getattr(obj, "branch_id", None)
        if obj_branch_id is None:
            return False
        return str(request.user.branch_id) == str(obj_branch_id)


# ── Branch ID helper ──────────────────────────────────────────────────────────

def get_request_branch_id(request):
    """
    Extract branch_id from the authenticated user's JWT or query params.

    Priority:
      1. Authenticated user's branch_id (from JWT — most secure)
      2. ?branch_id= query param (for unauthenticated / public routes)

    Super Admin has no branch — they must pass branch_id explicitly.
    """
    if request.user and request.user.is_authenticated:
        if request.user.role != Role.SUPER_ADMIN:
            branch_id = getattr(request.user, "branch_id", None)
            if branch_id:
                return str(branch_id)

    # Fallback to query param (unauthenticated menu browsing / superadmin)
    return request.query_params.get("branch_id") or request.data.get("branch_id")
