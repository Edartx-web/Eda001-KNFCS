"""
config/celery.py — Celery application for KNFC

Usage:
  Start worker:  celery -A config worker -l info
  Start beat:    celery -A config beat   -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

Tasks:
  stock.midnight_carryover  — runs at 23:59 IST daily (rolls stock + flags orders)
  stock.check_stock_alerts  — runs every 10 min (creates low/out alerts)
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("knfc")

# Load config from Django settings — all CELERY_* keys
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# ── Scheduled tasks (Celery Beat) ────────────────────────────────────────────
app.conf.beat_schedule = {
    # Midnight carryover — rolls remaining stock to next day, flags pending orders
    "midnight-carryover": {
        "task":     "stock.midnight_carryover",
        "schedule": crontab(hour=23, minute=59),
        "options":  {"expires": 3600},
    },
    # Stock alert check — every 10 minutes
    "check-stock-alerts": {
        "task":     "stock.check_stock_alerts",
        "schedule": crontab(minute="*/10"),
        "options":  {"expires": 600},
    },
    # Idle staff detection — every 15 minutes
    # Flags StaffSession.is_idle=True if last_seen > 60 min ago
    # Sends WebSocket alert to branch queue channel
    "check-idle-staff": {
        "task":     "accounts.check_idle_staff",
        "schedule": crontab(minute="*/15"),
        "options":  {"expires": 900},
    },
    # Daily duty reminder — 08:00 IST every morning
    # Notifies branch admins of staff who haven't logged in yet today
    "daily-duty-reminder": {
        "task":     "accounts.daily_duty_reminder",
        "schedule": crontab(hour=8, minute=0),
        "options":  {"expires": 3600},
    },
    # Auto-cancel stale orders — runs every 5 minutes
    # Cancels 'placed' orders with no staff confirmation within 30 minutes
    "auto-cancel-stale-orders": {
        "task":     "orders.auto_cancel_stale_orders",
        "schedule": crontab(minute="*/5"),
        "options":  {"expires": 300},
    },
    # Keep-alive pings — Render free-tier WEB services sleep after 15 min idle.
    # Render ignores self-pings; only external traffic counts.
    # The Celery WORKER never sleeps (it's a worker type, not web), so it acts
    # as the external pinger for both web services.
    "keep-backend-alive": {
        "task":     "config.tasks.ping_backend",
        "schedule": crontab(minute="*/12"),
        "options":  {"expires": 120},
    },
    "keep-whatsapp-alive": {
        "task":     "config.tasks.ping_whatsapp",
        "schedule": crontab(minute="2-59/12"),  # offset by 2 min so pings don't overlap
        "options":  {"expires": 120},
    },
}

app.conf.timezone = "Asia/Kolkata"
