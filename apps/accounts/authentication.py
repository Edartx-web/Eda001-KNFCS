"""
apps/accounts/authentication.py

Custom JWT authentication that enforces:
- Customer accounts must be OTP-verified (is_verified=True) before any API access.
- Unverified customer tokens are rejected with a clear message.
"""

import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions    import AuthenticationFailed

logger = logging.getLogger(__name__)


class VerifiedJWTAuthentication(JWTAuthentication):
    """
    Extends JWTAuthentication to reject tokens belonging to
    unverified customer accounts.

    Staff and admin accounts are not blocked here — they have
    their own email-verification flow enforced at registration.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user.role == "customer" and not user.is_verified:
            logger.warning(
                "Blocked unverified customer token: user_id=%s phone=%s",
                user.id, getattr(user, "phone", "?"),
            )
            raise AuthenticationFailed(
                "Your phone number has not been verified. "
                "Please complete OTP verification to continue.",
                code="account_not_verified",
            )
        return user
