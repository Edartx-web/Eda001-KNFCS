"""
utils/email.py

Email helpers for KNFC.

Two SMTP accounts:
  Primary (EMAIL_HOST_USER)    → Staff/Admin OTP, password reset
  Support (SUPPORT_EMAIL_USER) → Customer support replies

Use send_support_email() for anything customer-facing from the support queue.
Use Django's built-in send_mail() for staff/admin transactional emails.
"""
import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_support_email(to: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Send a customer-support email via the SUPPORT_EMAIL_USER SMTP account.
    Falls back to the primary SMTP if support credentials are not configured.
    """
    from django.core.mail.backends.smtp import EmailBackend

    user     = getattr(settings, "SUPPORT_EMAIL_USER",     "")
    password = getattr(settings, "SUPPORT_EMAIL_PASSWORD", "")
    host     = getattr(settings, "SUPPORT_EMAIL_HOST",     settings.EMAIL_HOST)
    port     = getattr(settings, "SUPPORT_EMAIL_PORT",     settings.EMAIL_PORT)
    use_tls  = getattr(settings, "SUPPORT_EMAIL_USE_TLS",  True)
    from_addr= getattr(settings, "SUPPORT_FROM_EMAIL",     settings.DEFAULT_FROM_EMAIL)

    if not user or not password:
        logger.warning(
            "SUPPORT_EMAIL_USER / SUPPORT_EMAIL_PASSWORD not set — "
            "falling back to primary SMTP for support email to %s", to
        )
        user     = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        from_addr= settings.DEFAULT_FROM_EMAIL

    try:
        backend = EmailBackend(
            host=host, port=port,
            username=user, password=password,
            use_tls=use_tls, fail_silently=False,
        )
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body or "Please view this email in an HTML-capable client.",
            from_email=from_addr,
            to=[to],
            connection=backend,
        )
        msg.attach_alternative(html_body, "text/html")
        msg.extra_headers = {
            "X-Mailer":       "KNFC-Support-Mailer/1.0",
            "Precedence":     "transactional",
            "Auto-Submitted": "auto-generated",
        }
        msg.send(fail_silently=False)
        logger.info("Support email sent → %s [%s]", to, subject)
        return True
    except Exception as e:
        logger.error("Support email failed → %s: %s", to, e)
        return False
