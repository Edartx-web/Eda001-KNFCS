"""
config/settings/base.py
Complete base settings for KNFC — Phase 1 (Auth) + Phase 2 (Menu/Orders/Stock/Offers).
Never import directly — use development.py or production.py.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY    = config("SECRET_KEY", default="INSECURE-dev-key-change-in-production")
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="",
                       cast=lambda v: [s.strip() for s in v.split(",") if s.strip()])

# These headers are safe in all environments (no SSL requirement)
X_FRAME_OPTIONS             = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER   = True       # adds X-XSS-Protection: 1; mode=block
SESSION_COOKIE_HTTPONLY      = True       # JS cannot read the session cookie
CSRF_COOKIE_HTTPONLY         = False      # CSRF token must be readable by JS/Axios
SESSION_COOKIE_SAMESITE      = "Lax"
CSRF_COOKIE_SAMESITE         = "Lax"

AUTH_USER_MODEL = "accounts.User"

# ── Installed apps ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "channels",

    # Phase 1 — Auth & Branches
    "apps.accounts",
    "apps.branches",

    # Phase 2 — Core business logic
    "apps.menu",
    "apps.offers",
    "apps.orders",
    "apps.stock",
    "apps.favourites",
    "apps.notifications",
    "apps.support",
]

# ── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF     = "config.urls"
ASGI_APPLICATION = "config.asgi.application"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS":    [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# ── Password validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE     = "Asia/Kolkata"
USE_I18N      = True
USE_TZ        = True

# ── Static & Media ────────────────────────────────────────────────────────────
STATIC_URL   = "/static/"
STATIC_ROOT  = BASE_DIR / "staticfiles"
MEDIA_URL    = "/media/"
MEDIA_ROOT   = BASE_DIR / "media"

# Public-facing backend base URL — used to build absolute media URLs in serializers.
# Override in production via BACKEND_URL env var (e.g. https://api.knfcs.com).
BACKEND_URL  = config("BACKEND_URL", default="http://localhost:1000")
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Write uploads >1 MB to a temp file instead of holding in RAM
FILE_UPLOAD_MAX_MEMORY_SIZE = 1 * 1024 * 1024   # 1 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB max form body

# ── DRF ──────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.VerifiedJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "NON_FIELD_ERRORS_KEY": "error",
    # AnonRateThrottle intentionally removed from DEFAULT_THROTTLE_CLASSES.
    # Unauthenticated browsing (menu, offers, branches, categories, hours)
    # is read-only and must never be rate-limited — a single home-page load
    # makes 10+ parallel requests and hitting a daily cap kills the whole site.
    # Sensitive write endpoints (OTP, order placement) override throttle_classes
    # in their own view classes and use custom per-key throttles (see below).
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "user":        "2000/hour",  # authenticated users — generous hourly bucket
        "order_place": "30/hour",    # order placement anti-abuse
        "otp_send":    "5/10min",    # OTP sends (anti-spam)
        "otp_verify":  "15/10min",   # OTP verification attempts
    }
}

# ── Simple JWT ────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ── OTP ───────────────────────────────────────────────────────────────────────
OTP_EXPIRY_MINUTES  = 15   # 15 min — gives staff time to find email / check spam
OTP_MAX_ATTEMPTS    = 5
OTP_RESEND_COOLDOWN = 60
OTP_LENGTH          = 6
OTP_BYPASS          = False

# ── Baileys WhatsApp service ──────────────────────────────────────────────────
WHATSAPP_SERVICE_URL  = config("WHATSAPP_SERVICE_URL",  default="http://127.0.0.1:3001")
WHATSAPP_INTERNAL_KEY = config("WHATSAPP_INTERNAL_KEY", default="knfc-wa-internal-key")

# ── Email ─────────────────────────────────────────────────────────────────────
# Primary SMTP — used for Staff OTP, BranchAdmin OTP, Password Reset
# Port 465/SSL is more reliable than 587/TLS from cloud servers (Render).
EMAIL_BACKEND       = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST          = config("EMAIL_HOST",          default="smtp.gmail.com")
EMAIL_PORT          = config("EMAIL_PORT",          default=465,  cast=int)
EMAIL_USE_TLS       = config("EMAIL_USE_TLS",       default=False, cast=bool)
EMAIL_USE_SSL       = config("EMAIL_USE_SSL",       default=True,  cast=bool)
EMAIL_TIMEOUT       = config("EMAIL_TIMEOUT",       default=15,   cast=int)
EMAIL_HOST_USER     = config("EMAIL_HOST_USER",     default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
# DEFAULT_FROM_EMAIL must match EMAIL_HOST_USER for Gmail SMTP.
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default=config("EMAIL_HOST_USER", default="noreply@knfc.com"),
)

# Secondary SMTP — Customer Support replies (CustomerSupportKNFC@gmail.com)
# Used by: apps/support/ when replying to customer tickets.
SUPPORT_EMAIL_HOST     = config("SUPPORT_EMAIL_HOST",     default=config("EMAIL_HOST",     default="smtp.gmail.com"))
SUPPORT_EMAIL_PORT     = config("SUPPORT_EMAIL_PORT",     default=config("EMAIL_PORT",     default="587"), cast=int)
SUPPORT_EMAIL_USE_TLS  = config("SUPPORT_EMAIL_USE_TLS",  default=True, cast=bool)
SUPPORT_EMAIL_USER     = config("SUPPORT_EMAIL_USER",     default=config("EMAIL_HOST_USER", default=""))
SUPPORT_EMAIL_PASSWORD = config("SUPPORT_EMAIL_PASSWORD", default=config("EMAIL_HOST_PASSWORD", default=""))
SUPPORT_FROM_EMAIL     = config("SUPPORT_FROM_EMAIL",     default=config("SUPPORT_EMAIL_USER", default="support@knfc.com"))

# ── Redis / Celery / Channels ─────────────────────────────────────────────────
REDIS_URL = config("REDIS_URL", default="redis://127.0.0.1:6379/0")

CELERY_BROKER_URL        = REDIS_URL
CELERY_RESULT_BACKEND    = REDIS_URL
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE          = TIME_ZONE

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG":  {"hosts": [REDIS_URL]},
    }
}

# ── Logging — Daphne, Django requests, app errors ─────────────────────────────
import os as _os
_LOG_DIR = BASE_DIR / "logs"
_os.makedirs(_LOG_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "error.log"),
            "maxBytes": 5 * 1024 * 1024,
            "backupCount": 5,
            "level": "ERROR",
            "formatter": "verbose",
        },
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "app.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 3,
            "level": "INFO",
            "formatter": "verbose",
        },
    },
    "loggers": {
        # Daphne ASGI server errors
        "daphne": {
            "handlers": ["console", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        # Django internals — only errors
        "django": {
            "handlers": ["console", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "error_file"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "error_file"],
            "level": "WARNING",
            "propagate": False,
        },
        # All KNFC app modules — INFO + errors
        "apps": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "utils": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "config": {
            "handlers": ["console", "error_file"],
            "level": "WARNING",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
}

CACHES = {
    "default": {
        "BACKEND":  "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}
