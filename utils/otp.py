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
    from django.core.mail import send_mail

    subjects = {
        "staff_email_verify": "Verify your KNFC staff account",
        "password_reset":     "Reset your KNFC password",
    }
    subject     = subjects.get(purpose, "Your KNFC verification code")
    title       = "Verify your email" if purpose == "staff_email_verify" else "Reset your password"
    description = (
        "Use this code to verify your KNFC staff account."
        if purpose == "staff_email_verify"
        else "Use this code to reset your KNFC account password."
    )
    expiry = getattr(settings, "OTP_EXPIRY_MINUTES", 5)

    text_message = (
        f"Your KNFC verification code is: {otp}\n\n"
        f"Valid for {expiry} minutes. Do not share this code with anyone."
    )

    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F4;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:480px;background:#FFFFFF;border-radius:16px;border:1px solid rgba(0,0,0,.08);box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#C85A1A,#9E3F0E);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">&#127831; KNFC</div>
            <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px;">KNFC Fried Chicken</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 28px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1208;">{title}</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#8B7560;line-height:1.6;">{description}</p>
            <div style="text-align:center;margin:0 0 28px;">
              <div style="display:inline-block;background:#FAF7F4;border:2px solid #C85A1A;border-radius:12px;padding:18px 36px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8B7560;margin-bottom:8px;">Your code</div>
                <div style="font-size:42px;font-weight:900;letter-spacing:8px;color:#C85A1A;font-family:monospace;">{otp}</div>
              </div>
            </div>
            <p style="margin:0;font-size:13px;color:#8B7560;text-align:center;line-height:1.6;">
              Valid for <strong style="color:#1A1208;">{expiry} minutes</strong>&nbsp;&middot;&nbsp;Do not share this code with anyone.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid rgba(0,0,0,.06);text-align:center;">
            <p style="margin:0;font-size:12px;color:#B5A494;">
              If you didn&rsquo;t request this, you can safely ignore this email &mdash; your account is secure.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    try:
        send_mail(
            subject        = subject,
            message        = text_message,
            from_email     = settings.DEFAULT_FROM_EMAIL,
            recipient_list = [email],
            fail_silently  = False,
            html_message   = html_message,
        )
        logger.info(f"OTP email sent → {email} [{purpose}]")
        return True
    except Exception as e:
        logger.error(f"Email failed → {email}: {e}")
        return False
