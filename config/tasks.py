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


@shared_task(name="config.tasks.ping_whatsapp")
def ping_whatsapp():
    """Keep knfc-whatsapp (Baileys Node.js) awake on Render free tier."""
    url = getattr(settings, "WHATSAPP_SERVICE_URL", "").rstrip("/")
    if not url:
        return
    try:
        r = requests.get(f"{url}/health", timeout=10)
        logger.info("keep-alive [whatsapp] %s → %s", url, r.status_code)
    except Exception as e:
        logger.warning("keep-alive [whatsapp] failed: %s", e)
