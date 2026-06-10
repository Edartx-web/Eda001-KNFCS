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
    """Send OTP via Baileys WhatsApp (otp session on the Node service).

    Retries once after 10 s if the service returns 503 — covers the Render
    free-tier cold-start window where the session is still reconnecting.
    """
    if getattr(settings, "OTP_BYPASS", False):
        logger.debug(f"[DEV WA-OTP] {phone}: {otp}")
        return True

    import time
    import requests as req_lib

    wa_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    wa_key = getattr(settings, "WHATSAPP_INTERNAL_KEY", "")
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 5)

    def _attempt():
        r = req_lib.post(
            f"{wa_url}/send-otp",
            json={"phone": phone, "otp": otp, "expiry_minutes": expiry},
            headers={"Content-Type": "application/json", "X-Internal-Key": wa_key},
            timeout=10,
        )
        return r

    try:
        r = _attempt()
        if r.status_code == 200:
            logger.info(f"WhatsApp OTP sent → {phone}")
            return True
        # 503 = WhatsApp session still reconnecting (Render cold-start) — retry once
        if r.status_code == 503:
            logger.warning(f"WhatsApp OTP 503 (cold-start?) → {phone}, retrying in 10 s")
            time.sleep(10)
            r2 = _attempt()
            if r2.status_code == 200:
                logger.info(f"WhatsApp OTP sent (retry) → {phone}")
                return True
            logger.error(f"WhatsApp OTP retry failed → {phone}: {r2.text}")
            return False
        logger.error(f"WhatsApp OTP failed → {phone}: {r.text}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp OTP error → {phone}: {e}")
        return False


def send_otp_email(email: str, otp: str, purpose: str) -> bool:
    from django.core.mail import EmailMultiAlternatives

    # Gmail SMTP requires the bare address to match EMAIL_HOST_USER.
    # We set a professional display name so it appears as "KNFC Fried Chicken"
    # in the inbox while the actual sending address stays the Gmail account.
    host_user = getattr(settings, "EMAIL_HOST_USER", "")
    from_email = f"KNFC Fried Chicken <{host_user}>" if host_user else getattr(settings, "DEFAULT_FROM_EMAIL", "")

    subjects = {
        "staff_email_verify": "Your Account Verification Code — KNFC",
        "password_reset":     "Reset Your Password — KNFC",
    }
    subject = subjects.get(purpose, "Your Verification Code — KNFC")

    action_label = (
        "Staff Account Verification"
        if purpose == "staff_email_verify"
        else "Password Reset"
    )
    action_description = (
        "verify your KNFC staff account"
        if purpose == "staff_email_verify"
        else "reset your KNFC account password"
    )
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 15)

    text_body = (
        f"Dear User,\n\n"
        f"We received a request to {action_description}. "
        f"Please use the following OTP to complete your {action_label.lower()}:\n\n"
        f"  {otp}\n\n"
        f"This code will expire in {expiry} minutes.\n\n"
        f"If you did not initiate this request, please disregard this message "
        f"and contact support if necessary.\n\n"
        f"Regards,\n"
        f"KNFC Fried Chicken\n"
        f"support@knfcs.com\n"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:500px;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#C85A1A;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">KNFC Fried Chicken</p>
              <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{action_label}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1a1a1a;">Dear User,</p>
              <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.7;">
                We received a request to <strong>{action_description}</strong>.
                Please use the following OTP to complete your {action_label.lower()}:
              </p>

              <!-- OTP box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#fdf6f2;border:2px dashed #C85A1A;border-radius:10px;padding:20px 48px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#a06040;">Your OTP</p>
                          <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#C85A1A;font-family:'Courier New',Courier,monospace;">{otp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#777777;text-align:center;line-height:1.6;">
                This code will expire in&nbsp;<strong style="color:#1a1a1a;">{expiry}&nbsp;minutes</strong>.
              </p>

              <!-- Warning box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#fff8f6;border-left:4px solid #C85A1A;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#7a4030;line-height:1.6;">
                      If you did not initiate this request, please disregard this message and
                      contact support if necessary.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Regards -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:14px;color:#333333;line-height:1.8;">
                Regards,<br>
                <strong>KNFC Fried Chicken</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 24px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                This is an automated message — please do not reply to this email.<br>
                For support, contact us at <a href="mailto:support@knfcs.com" style="color:#C85A1A;text-decoration:none;">support@knfcs.com</a>
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#cccccc;">
                &copy; 2025 KNFC Fried Chicken &nbsp;&bull;&nbsp; knfcs.com
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>"""

    try:
        msg = EmailMultiAlternatives(
            subject    = subject,
            body       = text_body,
            from_email = from_email,
            to         = [email],
            reply_to   = ["no-reply@knfcs.com"],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.extra_headers = {
            "X-Mailer":       "KNFC-Django-Mailer/1.0",
            "X-Priority":     "1",
            "Precedence":     "transactional",
            "Auto-Submitted": "auto-generated",
        }
        msg.send(fail_silently=False)
        logger.info("OTP email sent → %s [%s]", email, purpose)
        return True
    except Exception as e:
        logger.error("Email failed → %s [%s]: %s", email, purpose, e)
        return False
