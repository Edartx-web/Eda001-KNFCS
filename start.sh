#!/usr/bin/env bash
set -o errexit

# Start Celery worker in background (handles async tasks)
celery -A config worker -l warning --concurrency=2 --detach \
  --logfile=/tmp/celery-worker.log \
  --pidfile=/tmp/celery-worker.pid

# Start Celery beat in background (handles scheduled tasks)
celery -A config beat -l warning \
  --scheduler django_celery_beat.schedulers:DatabaseScheduler \
  --logfile=/tmp/celery-beat.log \
  --pidfile=/tmp/celery-beat.pid \
  --detach

echo "Celery worker + beat started"

# Start Django ASGI server (foreground)
# workers 2  — handles concurrent requests without queuing (Render free: 512 MB RAM)
# keep-alive 75 — matches Cloudflare / nginx defaults; avoids constant reconnects
# graceful-timeout 30 — lets in-flight requests finish before shutdown
exec python -m hypercorn config.asgi:application \
  --bind 0.0.0.0:$PORT \
  --workers 2 \
  --keep-alive 75 \
  --graceful-timeout 30
