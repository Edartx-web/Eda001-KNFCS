"""
apps/accounts/email_utils.py

Centralised email sending.  Uses EmailMultiAlternatives so every message
carries both a plain-text part AND an HTML part.  Plain-text is required to
avoid spam filters — sending HTML-only with an empty text part is one of the
strongest spam signals.

Headers added to every outgoing message:
  Reply-To        — keeps support replies off the noreply address
  List-Unsubscribe — required by Google / Yahoo bulk-sender rules (2024+)
  X-Mailer        — identifies the sending application
"""
import re
import html as _html_module
from datetime import datetime
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


# ── Internal helpers ─────────────────────────────────────────────────────────

def _html_to_text(html: str) -> str:
    """Minimal HTML → plain-text conversion for the fallback body."""
    # Remove <style> and <script> blocks
    text = re.sub(r"<(style|script)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.I)
    # Block-level tags → newlines
    text = re.sub(r"<(br|p|div|tr|li|h[1-6]|dt|dd)[^>]*>", "\n", text, flags=re.I)
    # Table cells → tab separator
    text = re.sub(r"<td[^>]*>", "\t", text, flags=re.I)
    # Strip all other tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode HTML entities
    text = _html_module.unescape(text)
    # Collapse excessive whitespace while keeping paragraph breaks
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _from_address() -> str:
    """Return a properly formatted From address with display name."""
    email = settings.DEFAULT_FROM_EMAIL
    # If already has a display name (e.g. "KNFC <x@y.com>"), return as-is
    if "<" in email:
        return email
    return f"KNFC Fried Chicken <{email}>"


def _send(subject: str, template: str, ctx: dict, to: str | list[str]) -> None:
    """
    Render *template* → HTML, derive plain-text fallback, send via
    EmailMultiAlternatives so both parts are always present.
    """
    ctx.setdefault("year", datetime.now().year)
    html_body  = render_to_string(f"emails/{template}", ctx)
    text_body  = _html_to_text(html_body)

    recipients = [to] if isinstance(to, str) else list(to)

    from_addr  = _from_address()
    support    = getattr(settings, "SUPPORT_FROM_EMAIL",
                         getattr(settings, "DEFAULT_FROM_EMAIL", ""))
    unsub_url  = f"{getattr(settings, 'FRONTEND_URL', 'https://knfcs.com')}/account"

    msg = EmailMultiAlternatives(
        subject      = subject,
        body         = text_body,          # plain-text — always set, never empty
        from_email   = from_addr,
        to           = recipients,
        headers      = {
            "Reply-To":        support or from_addr,
            "X-Mailer":        "KNFC Mailer 2.0",
            # Google / Yahoo 2024 bulk-sender requirement
            "List-Unsubscribe": f"<{unsub_url}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=True)


# ── Public helpers ────────────────────────────────────────────────────────────

def send_otp(to: str, name: str, otp: str, expiry: str = "5 minutes") -> None:
    _send(
        subject  = f"{otp} — KNFC verification code (expires in {expiry})",
        template = "otp.html",
        ctx      = {"name": name, "otp": otp, "expiry": expiry},
        to       = to,
    )


def send_staff_welcome(to: str, name: str, user_id: str, password: str, branch: str) -> None:
    _send(
        subject  = "Your KNFC staff account is ready",
        template = "staff_welcome.html",
        ctx      = {
            "name": name, "user_id": user_id,
            "password": password, "branch": branch,
            "login_url":     f"{getattr(settings, 'FRONTEND_URL', '')}/login/staff",
            "support_email": getattr(settings, "SUPPORT_FROM_EMAIL",
                                     settings.DEFAULT_FROM_EMAIL),
        },
        to = to,
    )


def send_branch_admin_welcome(to: str, name: str, email: str, password: str, branch: str) -> None:
    _send(
        subject  = "Your KNFC Branch Admin account is ready",
        template = "branch_admin_welcome.html",
        ctx      = {
            "name": name, "email": email,
            "password": password, "branch": branch,
            "login_url": f"{getattr(settings, 'FRONTEND_URL', '')}/login/admin",
        },
        to = to,
    )


def send_order_confirmed(to: str, customer_name: str, token_number: str | int,
                         branch_name: str, items: list, total: float,
                         discount: float = 0, order_type: str = "Pickup",
                         payment_method: str = "Cash") -> None:
    _send(
        subject  = f"Order #{token_number} received at {branch_name}",
        template = "order_confirmed.html",
        ctx      = {
            "customer_name":  customer_name,
            "token_number":   token_number,
            "branch_name":    branch_name,
            "items":          items,
            "total":          total,
            "discount":       discount,
            "order_type":     order_type,
            "payment_method": payment_method,
        },
        to = to,
    )


def send_forgot_password(to: str, name: str, reset_url: str, expiry: str = "30 minutes") -> None:
    _send(
        subject  = "Reset your KNFC password",
        template = "forgot_password.html",
        ctx      = {"name": name, "email": to, "reset_url": reset_url, "expiry": expiry},
        to       = to,
    )
