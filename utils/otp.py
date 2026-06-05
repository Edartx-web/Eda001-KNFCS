"""
utils/otp.py

OTP lifecycle:
  generate_otp()            → plain 6-digit string
  hash_otp(plain)           → sha256 hex digest (stored in DB)
  verify_otp_hash()         → constant-time compare
  create_otp_record()       → deletes old record, inserts new one, returns plain OTP
  validate_otp()            → checks hash, expiry, attempts; marks used on success
  can_resend()              → returns (allowed: bool, wait_seconds: int)
  send_otp_whatsapp()       → Baileys WhatsApp OTP (via Node service)
  send_otp_email()          → Django send_mail
"""

import hashlib
import hmac
import logging
import random
import string

from datetime import timedelta
from django.conf   import settings
from django.utils  import timezone

logger = logging.getLogger(__name__)


# ── Generate ──────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    length = getattr(settings, "OTP_LENGTH", 6)
    return "".join(random.SystemRandom().choices(string.digits, k=length))


# ── Hash ──────────────────────────────────────────────────────────────────────

def hash_otp(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def verify_otp_hash(plain: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(plain), stored_hash)


# ── Expiry ────────────────────────────────────────────────────────────────────

def otp_expiry():
    minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 5)
    return timezone.now() + timedelta(minutes=minutes)


def can_resend(otp_record):
    """Return (allowed: bool, wait_seconds: int)."""
    cooldown  = getattr(settings, "OTP_RESEND_COOLDOWN", 60)
    elapsed   = (timezone.now() - otp_record.created_at).total_seconds()
    remaining = max(0, int(cooldown - elapsed))
    return (remaining == 0, remaining)


# ── Create ────────────────────────────────────────────────────────────────────

def create_otp_record(user, purpose: str) -> str:
    """
    Delete any existing OTP for user+purpose, create a new one.
    Returns the plain OTP (never stored).
    """
    from apps.accounts.models import OTPRecord
    plain = generate_otp()
    OTPRecord.objects.filter(user=user, purpose=purpose).delete()
    OTPRecord.objects.create(
        user       = user,
        otp_hash   = hash_otp(plain),
        purpose    = purpose,
        expires_at = otp_expiry(),
        attempts   = 0,
        is_used    = False,
    )
    logger.info(f"OTP created: user={user.id} purpose={purpose}")
    return plain


# ── Validate ──────────────────────────────────────────────────────────────────

def validate_otp(user, purpose: str, plain: str):
    """
    Returns (success: bool, error_message: str).
    On success marks OTP as used.
    """
    from apps.accounts.models import OTPRecord

    # Dev bypass — accept any non-empty OTP code in development mode
    if getattr(settings, "OTP_BYPASS", False):
        logger.debug(f"OTP bypass active: user={user.id} purpose={purpose}")
        OTPRecord.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
        return True, ""

    try:
        record = OTPRecord.objects.get(user=user, purpose=purpose, is_used=False)
    except OTPRecord.DoesNotExist:
        count = OTPRecord.objects.filter(user=user, purpose=purpose).count()
        logger.warning(f"validate_otp: no active record for user={user.id} purpose={purpose} (total records={count})")
        return False, "No active OTP found. Please request a new one."

    if record.is_expired:
        logger.warning(f"validate_otp: expired for user={user.id} purpose={purpose} expired_at={record.expires_at}")
        record.delete()
        return False, "OTP has expired. Please request a new one."

    if record.is_exhausted:
        record.delete()
        return False, "Too many wrong attempts. Please request a new OTP."

    if not verify_otp_hash(plain, record.otp_hash):
        logger.warning(f"validate_otp: hash mismatch for user={user.id} purpose={purpose} plain_len={len(plain)}")
        record.increment_attempts()
        remaining = settings.OTP_MAX_ATTEMPTS - record.attempts
        if remaining <= 0:
            record.delete()
            return False, "Too many wrong attempts. Please request a new OTP."
        return False, f"Incorrect OTP. {remaining} attempt(s) remaining."

    record.mark_used()
    logger.info(f"OTP verified: user={user.id} purpose={purpose}")
    return True, ""


# ── Send ──────────────────────────────────────────────────────────────────────

def send_otp_whatsapp(phone: str, otp: str) -> bool:
    """Send OTP via Baileys WhatsApp (otp session on the Node service)."""
    if getattr(settings, "OTP_BYPASS", False):
        logger.debug(f"[DEV WA-OTP] {phone}: {otp}")
        return True

    wa_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    wa_key = getattr(settings, "WHATSAPP_INTERNAL_KEY", "")
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 5)

    try:
        import requests as req_lib
        r = req_lib.post(
            f"{wa_url}/send-otp",
            json={"phone": phone, "otp": otp, "expiry_minutes": expiry},
            headers={"Content-Type": "application/json", "X-Internal-Key": wa_key},
            timeout=8,
        )
        if r.status_code == 200:
            logger.info(f"WhatsApp OTP sent → {phone}")
            return True
        logger.error(f"WhatsApp OTP failed → {phone}: {r.text}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp OTP error → {phone}: {e}")
        return False


def send_otp_email(email: str, otp: str, purpose: str) -> bool:
    from django.core.mail import EmailMultiAlternatives

    # Ensure FROM matches the authenticated Gmail account — Gmail rejects mismatches
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    host_user  = getattr(settings, "EMAIL_HOST_USER", "")
    if host_user and from_email:
        _bare_from = from_email.split("<")[-1].rstrip(">").strip() if "<" in from_email else from_email
        if _bare_from.lower() != host_user.lower():
            logger.warning(
                "DEFAULT_FROM_EMAIL '%s' != EMAIL_HOST_USER '%s' — fixing sender.",
                _bare_from, host_user,
            )
            from_email = host_user

    subjects = {
        "staff_email_verify": "[KNFC] Your staff account verification code",
        "password_reset":     "[KNFC] Reset your password",
    }
    subject = subjects.get(purpose, "[KNFC] Your verification code")

    title = (
        "Verify your staff account"
        if purpose == "staff_email_verify"
        else "Reset your password"
    )
    description = (
        "Use this one-time code to verify your KNFC staff account and set your password."
        if purpose == "staff_email_verify"
        else "Use this one-time code to reset your KNFC account password."
    )
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 15)

    # Plain text — always include for spam score
    text_body = (
        f"KNFC Fried Chicken\n"
        f"{'=' * 40}\n\n"
        f"{title}\n\n"
        f"{description}\n\n"
        f"Your verification code: {otp}\n\n"
        f"Valid for {expiry} minutes.\n"
        f"Do not share this code with anyone.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"-- KNFC Staff Team\n"
        f"knfchead01@gmail.com\n"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:24px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:480px;background-color:#ffffff;border-radius:8px;border:1px solid #e0e0e0;">

          <!-- Header -->
          <tr>
            <td style="background-color:#C85A1A;border-radius:8px 8px 0 0;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">KNFC Fried Chicken</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Staff Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">{title}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#666666;line-height:1.6;">{description}</p>

              <!-- OTP box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#fef9f5;border:2px solid #C85A1A;border-radius:8px;padding:16px 32px;text-align:center;">
                          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8b7560;">Verification code</p>
                          <p style="margin:0;font-size:38px;font-weight:700;letter-spacing:10px;color:#C85A1A;font-family:Courier,monospace;">{otp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888888;text-align:center;line-height:1.6;">
                Code valid for <strong style="color:#1a1a1a;">{expiry}&nbsp;minutes</strong>
                &nbsp;&bull;&nbsp;Do not share this code with anyone
              </p>
            </td>
          </tr>

          <!-- Spam tip -->
          <tr>
            <td style="padding:0 32px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;">
                    <p style="margin:0;font-size:12px;color:#7a6000;line-height:1.5;">
                      <strong>Didn't see this email?</strong> Check your <strong>Spam</strong> or
                      <strong>Promotions</strong> folder. Mark as "Not spam" to receive future codes in your inbox.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                You are receiving this because an account action was requested for this email address.<br>
                If you did not request this, ignore this email &mdash; your account is safe.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#bbbbbb;">KNFC Fried Chicken &bull; knfchead01@gmail.com</p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>
</body>
</html>"""

    try:
        msg = EmailMultiAlternatives(
            subject   = subject,
            body      = text_body,
            from_email= from_email,
            to        = [email],
        )
        msg.attach_alternative(html_body, "text/html")
        # Anti-spam headers: mark as transactional, not bulk marketing
        msg.extra_headers = {
            "X-Mailer":         "KNFC-Django-Mailer/1.0",
            "X-Priority":       "1",
            "Precedence":       "transactional",
            "Auto-Submitted":   "auto-generated",
        }
        msg.send(fail_silently=False)
        logger.info("OTP email sent → %s [%s]", email, purpose)
        return True
    except Exception as e:
        logger.error("Email failed → %s [%s]: %s", email, purpose, e)
        return False
