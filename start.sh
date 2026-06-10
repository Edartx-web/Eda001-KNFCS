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
exec python -m hypercorn config.asgi:application \
  --bind 0.0.0.0:$PORT \
  --workers 1 \
  --keep-alive 5
