"""
config/settings/test.py
Fast test settings — SQLite in-memory, no external services.
Usage:  python manage.py test --settings=config.settings.test
"""
from .base import *

DEBUG = False

# In-memory SQLite — no CREATEDB needed, fast, isolated
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME":   ":memory:",
    }
}

# Skip migrations for speed (recreates tables from models directly)
# Remove this if you need to test migration logic itself
MIGRATION_MODULES = {}  # empty dict → use real migrations

# Throttle rates must remain so OTPSendThrottle/OTPVerifyThrottle initialise.
# Use LocMemCache so throttle state resets between test runs.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["otp_send"]   = "999/day"
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["otp_verify"]  = "999/day"
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["order_place"] = "999/day"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# OTP dev bypass
OTP_BYPASS      = True
OTP_BYPASS_CODE = "123456"

# Silence logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "handlers": {"null": {"class": "logging.NullHandler"}},
    "root": {"handlers": ["null"], "level": "CRITICAL"},
}

# No Redis needed for tests
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
CELERY_TASK_ALWAYS_EAGER = True   # run Celery tasks synchronously
CELERY_TASK_EAGER_PROPAGATES = True
