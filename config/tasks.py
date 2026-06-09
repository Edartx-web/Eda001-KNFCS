"""
config/tasks.py — System-level Celery tasks

ping_backend: keeps the Render free-tier web service warm by hitting
the health endpoint every 12 minutes (Celery worker never sleeps).
"""

import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name="config.tasks.ping_backend")
def ping_backend():
    """Ping own health endpoint to prevent Render free-tier cold starts."""
    backend_url = getattr(settings, "BACKEND_URL", "").rstrip("/")
    if not backend_url:
        return

    try:
        r = requests.get(f"{backend_url}/api/v1/branches/", timeout=10)
        logger.info("keep-alive ping → %s (%s)", backend_url, r.status_code)
    except Exception as e:
        logger.warning("keep-alive ping failed: %s", e)
