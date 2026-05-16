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
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── DRF ──────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
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
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon":        "300/day",    # raised from 100 — prevents 429 for normal browsing
        "user":        "3000/day",   # raised from 1000
        "order_place": "20/hour",
        "otp_send":    "5/10min",    # 5 OTPs per 10 minutes (was wrongly "5/minute")
        "otp_verify":  "10/10min",   # 10 attempts per 10 minutes
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
OTP_EXPIRY_MINUTES  = 5
OTP_MAX_ATTEMPTS    = 3
OTP_RESEND_COOLDOWN = 60
OTP_LENGTH          = 6
OTP_BYPASS          = False
OTP_BYPASS_CODE     = "123456"

# ── Baileys WhatsApp service ──────────────────────────────────────────────────
WHATSAPP_SERVICE_URL  = config("WHATSAPP_SERVICE_URL",  default="http://127.0.0.1:3001")
WHATSAPP_INTERNAL_KEY = config("WHATSAPP_INTERNAL_KEY", default="knfc-wa-internal-key")

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND       = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST          = config("EMAIL_HOST",          default="smtp.gmail.com")
EMAIL_PORT          = config("EMAIL_PORT",          default=587, cast=int)
EMAIL_USE_TLS       = config("EMAIL_USE_TLS",       default=True, cast=bool)
EMAIL_HOST_USER     = config("EMAIL_HOST_USER",     default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL  = config("DEFAULT_FROM_EMAIL",  default="noreply@knfc.com")

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

CACHES = {
    "default": {
        "BACKEND":  "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}
