"""
config/settings/production.py

Production settings for KNFC.

Deploy with:
  DJANGO_SETTINGS_MODULE=config.settings.production

Required environment variables (.env):
  SECRET_KEY          — long random string
  ALLOWED_HOSTS       — comma-separated domains e.g. knfc.example.com
  DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
  REDIS_URL           — redis://redis:6379/0
  EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL
  WHATSAPP_SERVICE_URL  — URL of Baileys Node service e.g. http://127.0.0.1:3001
  WHATSAPP_INTERNAL_KEY — shared secret between Django and Baileys service
  SENTRY_DSN            — optional, for error monitoring
"""
from .base import *

# Optional: Sentry error monitoring (pip install sentry-sdk to enable)
try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False

# ── Security ──────────────────────────────────────────────────────────────────
DEBUG = False

SECURE_SSL_REDIRECT            = True
SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
SECURE_BROWSER_XSS_FILTER      = True
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
X_FRAME_OPTIONS                = "DENY"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE":   "django.db.backends.postgresql",
        "NAME":     config("DB_NAME"),
        "USER":     config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST":     config("DB_HOST"),
        "PORT":     config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS":  {"sslmode": "require"},
    }
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
CORS_ALLOW_CREDENTIALS = True

# ── Static files (Whitenoise) ─────────────────────────────────────────────────
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# ── OTP — real SMS in production ──────────────────────────────────────────────
OTP_BYPASS      = False
OTP_BYPASS_CODE = ""

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style":  "{",
        },
    },
    "handlers": {
        "console": {
            "class":     "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level":    "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level":    "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level":    "INFO",
            "propagate": False,
        },
    },
}

# ── Sentry error monitoring (optional) ───────────────────────────────────────
_sentry_dsn = config("SENTRY_DSN", default="")
if _sentry_dsn and _SENTRY_AVAILABLE:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True