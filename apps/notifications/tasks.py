"""
apps/notifications/tasks.py

Broadcast algorithm:
  - Split all target phones into batches of BATCH_SIZE
  - Send each message with MESSAGE_DELAY seconds between each send
  - Wait BATCH_COOLDOWN seconds between batches (Celery countdown / thread sleep)

Two execution modes:
  1. Celery available → tasks queued via .delay() / apply_async(countdown=…)
  2. Celery unavailable → run_broadcast() falls back to a daemon thread
     (good for dev; for prod always run a Celery worker)
"""
import logging
import time
import threading
import requests as req_lib

from django.conf  import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

BATCH_SIZE     = 25   # messages per batch
MESSAGE_DELAY  = 2    # seconds between each message within a batch
BATCH_COOLDOWN = 30   # seconds between batches (avoids WA rate-limit; 25×2s within batch = natural gap)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _wa_headers():
    return {
        "Content-Type":   "application/json",
        "X-Internal-Key": getattr(settings, "WHATSAPP_INTERNAL_KEY", ""),
    }


def _get_target_phones(broadcast):
    from apps.accounts.models import User
    qs = User.objects.filter(role="customer", phone__isnull=False).exclude(phone="")
    if broadcast.target == "branch" and broadcast.branch_id:
        from apps.orders.models import Order
        customer_ids = list(
            Order.objects
            .filter(branch_id=broadcast.branch_id, customer__isnull=False)
            .values_list("customer_id", flat=True)
            .distinct()
        )
        if customer_ids:
            qs = qs.filter(id__in=customer_ids)
        # else: branch has no order history yet — fall through to send to all customers
    return list(qs.values_list("phone", flat=True))


# ── Core send logic (pure Python, no Celery dependency) ───────────────────────

def _send_batch(broadcast_id, phone_batch, batch_index, total_batches):
    """Send one batch. Called by both the Celery task and the sync thread."""
    from apps.notifications.models import BroadcastLog
    from django.db.models import F

    try:
        broadcast = BroadcastLog.objects.get(id=broadcast_id)
    except BroadcastLog.DoesNotExist:
        return

    wa_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    sent = failed = 0

    from apps.branches.site_config import SiteConfig
    site_url = (SiteConfig.get().site_url or "").rstrip("/")

    for phone in phone_batch:
        payload = {"phone": phone, "text": broadcast.message}
        if broadcast.image_url:
            payload = {"phone": phone, "image_url": broadcast.image_url, "caption": broadcast.message}
        if site_url:
            payload["button_url"]  = f"{site_url}/offers"
            payload["button_text"] = "Order Now"
        # Pass coupon code so the Node service can add a Copy Code button
        if broadcast.offer and getattr(broadcast.offer, "coupon_code", None):
            payload["coupon_code"] = broadcast.offer.coupon_code
        try:
            r = req_lib.post(
                f"{wa_url}/send-message",
                json=payload,
                headers=_wa_headers(),
                timeout=10,
            )
            if r.status_code == 200:
                sent += 1
            else:
                logger.warning(f"Broadcast send failed for {phone}: {r.text}")
                failed += 1
        except Exception as e:
            logger.error(f"Broadcast send error for {phone}: {e}")
            failed += 1
        time.sleep(MESSAGE_DELAY)

    BroadcastLog.objects.filter(id=broadcast_id).update(
        sent_count=F("sent_count") + sent,
        failed_count=F("failed_count") + failed,
    )
    logger.info(
        f"[broadcast:{broadcast_id}] Batch {batch_index+1}/{total_batches} — "
        f"sent={sent} failed={failed}"
    )

    if batch_index + 1 >= total_batches:
        BroadcastLog.objects.filter(id=broadcast_id).update(
            status="done",
            completed_at=timezone.now(),
        )
        logger.info(f"[broadcast:{broadcast_id}] Completed")


def _check_wa_broadcast_connected():
    """Return (True, None) if Baileys broadcast session is connected, else (False, reason)."""
    wa_url = getattr(settings, "WHATSAPP_SERVICE_URL", "http://127.0.0.1:3001")
    try:
        r = req_lib.get(f"{wa_url}/status", headers=_wa_headers(), timeout=5)
        if r.status_code == 200:
            data = r.json()
            bcast = data.get("broadcast", {})
            if bcast.get("status") == "connected":
                return True, None
            return False, f"WhatsApp broadcast session not connected (status: {bcast.get('status', 'unknown')}) — scan QR in the WhatsApp page"
        return False, f"WhatsApp service returned {r.status_code}"
    except Exception as e:
        return False, f"WhatsApp service unreachable: {e}"


def _run_broadcast_body(broadcast_id):
    """Full broadcast logic. Called by both the Celery task and the sync thread."""
    from apps.notifications.models import BroadcastLog

    try:
        broadcast = BroadcastLog.objects.get(id=broadcast_id)
    except BroadcastLog.DoesNotExist:
        return

    # Pre-flight: ensure the WhatsApp broadcast session is connected
    connected, reason = _check_wa_broadcast_connected()
    if not connected:
        BroadcastLog.objects.filter(id=broadcast_id).update(
            status=BroadcastLog.STATUS_FAILED,
            completed_at=timezone.now(),
        )
        logger.error(f"[broadcast:{broadcast_id}] Aborted — {reason}")
        return

    phones = _get_target_phones(broadcast)
    if not phones:
        BroadcastLog.objects.filter(id=broadcast_id).update(
            status="done", completed_at=timezone.now(), total_recipients=0
        )
        logger.info(f"[broadcast:{broadcast_id}] No recipients — marked done")
        return

    batches = [phones[i:i + BATCH_SIZE] for i in range(0, len(phones), BATCH_SIZE)]
    total   = len(batches)

    BroadcastLog.objects.filter(id=broadcast_id).update(
        status="running",
        total_recipients=len(phones),
    )
    logger.info(
        f"[broadcast:{broadcast_id}] Starting — {len(phones)} recipients, {total} batches"
    )
    return batches, total


# ── Celery tasks (registered only when Celery is available) ───────────────────

try:
    from config.celery import app as celery_app

    @celery_app.task(bind=True, max_retries=3, name="notifications.send_broadcast_batch")
    def send_broadcast_batch(self, broadcast_id, phone_batch, batch_index, total_batches):
        _send_batch(broadcast_id, phone_batch, batch_index, total_batches)

    @celery_app.task(name="notifications.run_broadcast")
    def run_broadcast(broadcast_id):
        result = _run_broadcast_body(broadcast_id)
        if result is None:
            return
        batches, total = result
        for i, batch in enumerate(batches):
            send_broadcast_batch.apply_async(
                args=[broadcast_id, batch, i, total],
                countdown=i * BATCH_COOLDOWN,
            )

    _CELERY_OK = True
    logger.debug("Broadcast Celery tasks registered")

except Exception as _celery_err:
    _CELERY_OK = False
    logger.warning(f"Celery unavailable — broadcast will use thread fallback: {_celery_err}")

    # ── Thread fallback: run all batches sequentially in a daemon thread ──────
    def run_broadcast(broadcast_id):
        """Fallback used when Celery is not available."""
        result = _run_broadcast_body(broadcast_id)
        if result is None:
            return
        batches, total = result

        def _worker():
            for i, batch in enumerate(batches):
                if i > 0:
                    time.sleep(BATCH_COOLDOWN)
                _send_batch(broadcast_id, batch, i, total)

        t = threading.Thread(target=_worker, daemon=True, name=f"broadcast-{broadcast_id}")
        t.start()
        logger.info(f"[broadcast:{broadcast_id}] Thread started (Celery fallback)")

    # Give run_broadcast a .delay() method so call sites stay identical
    def _delay(broadcast_id):
        run_broadcast(broadcast_id)

    run_broadcast.delay = _delay


# ── Force-run helper (bypasses Celery, always uses a thread) ──────────────────

def run_broadcast_in_thread(broadcast_id):
    """
    Reset counters and run the full broadcast in a daemon thread.
    Use this when Celery worker is not running / tasks are stuck in queue.
    """
    from apps.notifications.models import BroadcastLog
    BroadcastLog.objects.filter(pk=broadcast_id).update(
        status=BroadcastLog.STATUS_PENDING,
        sent_count=0,
        failed_count=0,
        total_recipients=0,
        completed_at=None,
    )
    result = _run_broadcast_body(broadcast_id)
    if result is None:
        return
    batches, total = result

    def _worker():
        for i, batch in enumerate(batches):
            if i > 0:
                time.sleep(BATCH_COOLDOWN)
            _send_batch(broadcast_id, batch, i, total)

    t = threading.Thread(target=_worker, daemon=True, name=f"force-broadcast-{broadcast_id}")
    t.start()
    logger.info(f"[broadcast:{broadcast_id}] Force-run thread started (Celery bypassed)")
