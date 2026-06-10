"""
config/tasks.py — System-level Celery tasks

Celery now runs inside the Django web dyno (start.sh).
ping_backend is removed — a service cannot keep itself alive via self-ping.
ping_whatsapp keeps the WhatsApp service alive (it's a separate web service).

External keep-alive for this backend: use cron-job.org to ping
/api/v1/branches/ every 10 minutes.
"""

import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_alert_email(subject, body, cooldown_key=None, cooldown_seconds=3600):
    """
    Fire-and-forget alert email to the admin.
    If cooldown_key is given, suppresses repeated sends within cooldown_seconds
    (default 1 hour) so a persistent disconnect doesn't spam the inbox.
    """
    try:
        if cooldown_key:
            from django.core.cache import cache
            if cache.get(cooldown_key):
                return
            cache.set(cooldown_key, True, cooldown_seconds)

        from django.core.mail import send_mail
        admin_email = getattr(settings, "EMAIL_HOST_USER", "")
        if not admin_email:
            return
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", admin_email),
            recipient_list=[admin_email],
            fail_silently=True,
        )
    except Exception:
        pass


@shared_task(name="config.tasks.ping_whatsapp")
def ping_whatsapp():
    """
    Keep knfc-whatsapp (Baileys Node.js) awake on Render free tier.

    1. Pings /health  — prevents the Render container from sleeping.
    2. Checks /status — if OTP session is disconnected, emails the admin.
       This catches session drops that happen after a Render restart or
       WhatsApp Web session expiry, before any customer hits the OTP wall.
    """
    url = getattr(settings, "WHATSAPP_SERVICE_URL", "").rstrip("/")
    wa_key = getattr(settings, "WHATSAPP_INTERNAL_KEY", "")
    if not url:
        logger.warning("ping_whatsapp: WHATSAPP_SERVICE_URL not set — skipping")
        return

    # ── Step 1: keep-alive ping ───────────────────────────────────────────────
    try:
        r = requests.get(f"{url}/health", timeout=10)
        logger.info("keep-alive [whatsapp] %s → %s", url, r.status_code)
    except Exception as e:
        logger.warning("keep-alive [whatsapp] /health unreachable: %s", e)
        _send_alert_email(
            "[KNFC] WhatsApp service is DOWN",
            f"The WhatsApp Node.js service at {url} is not responding.\n\n"
            "Check the Render dashboard — the service may have crashed or been stopped.\n\n"
            "WhatsApp Management: https://knfcs.com/superadmin/whatsapp",
            cooldown_key="wa_alert_service_down",
        )
        return  # no point checking status if service is down

    # ── Step 2: session health check ─────────────────────────────────────────
    try:
        s = requests.get(
            f"{url}/status",
            headers={"X-Internal-Key": wa_key},
            timeout=10,
        )
        if s.status_code != 200:
            logger.warning("ping_whatsapp: /status returned %s", s.status_code)
            return

        data = s.json()
        otp_status       = data.get("otp",       {}).get("status", "unknown")
        broadcast_status = data.get("broadcast", {}).get("status", "unknown")

        if otp_status != "connected":
            logger.warning("ping_whatsapp: OTP session is '%s' — alerting admin", otp_status)
            _send_alert_email(
                f"[KNFC] WhatsApp OTP session disconnected ({otp_status})",
                f"The OTP WhatsApp session is currently '{otp_status}'.\n\n"
                "Customers cannot receive OTP codes until you re-scan the QR code.\n\n"
                "Action required: open the WhatsApp admin panel and scan the QR.\n"
                "WhatsApp Management: https://knfcs.com/superadmin/whatsapp",
                cooldown_key="wa_alert_otp_disconnected",
            )
        else:
            logger.info("ping_whatsapp: OTP=%s broadcast=%s", otp_status, broadcast_status)

    except Exception as e:
        logger.warning("ping_whatsapp: /status check failed: %s", e)
