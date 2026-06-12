"""
utils/email_backend.py — thin diagnostic wrapper around Django's standard SMTP backend.

Previous versions tried to force IPv4 via connect()/socket overrides. All of those
approaches broke in various ways. The standard Django EmailBackend is used directly;
if IPv6 causes ENETUNREACH on a particular Render instance, set EMAIL_HOST to the
numeric IPv4 address of smtp.gmail.com instead of the hostname.
"""
import logging
from django.core.mail.backends.smtp import EmailBackend as _Base

logger = logging.getLogger(__name__)


class IPv4EmailBackend(_Base):
    """
    Drop-in alias kept so settings don't need changing.
    Delegates entirely to Django's standard SMTP EmailBackend.
    """
    pass
