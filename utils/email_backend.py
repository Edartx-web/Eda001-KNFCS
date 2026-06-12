"""
utils/email_backend.py

The primary email backend is now anymail.backends.resend.EmailBackend (HTTP API,
port 443 — works on Render free tier where SMTP ports 465/587 are blocked).

This file is kept only because some Render env vars still set
EMAIL_BACKEND=utils.email_backend.IPv4EmailBackend.  It delegates entirely to
Django's standard SMTP backend, but that path is no longer used in production.
"""
import logging
from django.core.mail.backends.smtp import EmailBackend as _Base

logger = logging.getLogger(__name__)


class IPv4EmailBackend(_Base):
    """Legacy alias — production uses anymail.backends.resend.EmailBackend."""
    pass
