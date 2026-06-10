"""
config/tasks.py — System-level Celery tasks

Celery worker = Render 'worker' type → never spins down due to inactivity.
Used to keep Render free-tier 'web' services alive by pinging them every
12 minutes (Render's idle cutoff is 15 minutes).

Self-pings from within the same container do NOT count as inbound traffic
on Render — only external pings prevent spin-down. The Celery worker is
the external pinger for both knfc-backend and knfc-whatsapp.
"""

import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name="config.tasks.ping_backend")
def ping_backend():
    """Keep knfc-backend (Django) awake on Render free tier."""
    url = getattr(settings, "BACKEND_URL", "").rstrip("/")
    if not url:
        return
    try:
        r = requests.get(f"{url}/api/v1/branches/", timeout=10)
        logger.info("keep-alive [backend] %s → %s", url, r.status_code)
    except Exception as e:
        logger.warning("keep-alive [backend] failed: %s", e)


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
