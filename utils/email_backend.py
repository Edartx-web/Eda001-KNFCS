"""
utils/email_backend.py

IPv4EmailBackend is kept as a named alias because the Render env var
EMAIL_BACKEND=utils.email_backend.IPv4EmailBackend was set when the project
used SMTP.  It now delegates to anymail's Resend backend (HTTP API, port 443)
so the old env var still works without a Render config change.
"""
from anymail.backends.resend import EmailBackend as _Base


class IPv4EmailBackend(_Base):
    """Legacy name — delegates to anymail Resend HTTP backend."""
    pass
