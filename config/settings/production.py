"""
config/settings/production.py

Production settings for KNFC.

Deploy with:
  DJANGO_SETTINGS_MODULE=config.settings.production

Required environment variables (.env):
  SECRET_KEY          — long random string
  ALLOWED_HOSTS       — comma-separated domains e.g. knfcs.com,api.knfcs.com
  DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
  REDIS_URL           — redis://127.0.0.1:6379/0
  EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL
  WHATSAPP_SERVICE_URL  — URL of Baileys Node service e.g. http://127.0.0.1:3001
  WHATSAPP_INTERNAL_KEY — shared secret between Django and Baileys service
  CORS_ALLOWED_ORIGINS  — comma-separated allowed origins
  DB_SSL_REQUIRE        — set to True only if your PostgreSQL server has SSL (default: False)
  SENTRY_DSN            — optional, for error monitoring
"""
import dj_database_url
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

_allowed_extra = config(
    "ALLOWED_HOSTS", default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
ALLOWED_HOSTS = list({
    "knfcs.com", "www.knfcs.com", "api.knfcs.com", "wa.knfcs.com",
    ".onrender.com",   # Render deployment URLs (*.onrender.com)
    "localhost", "127.0.0.1",
    *_allowed_extra,
})

# Trust proxy SSL termination (Nginx / Cloudflare / any reverse proxy)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST    = True
USE_X_FORWARDED_PORT    = True

# SSL redirect is handled by Nginx/Cloudflare in front of daphne.
# Daphne itself serves plain HTTP internally — let the proxy redirect HTTP→HTTPS.
SECURE_SSL_REDIRECT            = False
SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True
SECURE_CONTENT_TYPE_NOSNIFF    = True
SECURE_BROWSER_XSS_FILTER      = True
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
X_FRAME_OPTIONS                = "DENY"

# ── Database ──────────────────────────────────────────────────────────────────
# Individual vars avoid URL-encoding issues with special characters in passwords.
DATABASES = {
    "default": {
        "ENGINE":       "django.db.backends.postgresql",
        "NAME":         config("DB_NAME",     default="postgres"),
        "USER":         config("DB_USER"),
        "PASSWORD":     config("DB_PASSWORD"),
        "HOST":         config("DB_HOST"),
        "PORT":         config("DB_PORT",     default="5432"),
        "CONN_MAX_AGE": 0,
        "OPTIONS":      {"sslmode": "require"},
    }
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# Production URLs:
#   Frontend  → https://knfcs.com       (Cloudflare Tunnel → localhost:3000)
#   Backend   → https://api.knfcs.com   (Cloudflare Tunnel → localhost:1000)
#   WhatsApp  → https://wa.knfcs.com    (Cloudflare Tunnel → localhost:1000)
_cors_extra = config(
    "CORS_ALLOWED_ORIGINS", default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
CORS_ALLOWED_ORIGINS = list({
    "https://knfcs.com",
    "https://www.knfcs.com",
    "https://api.knfcs.com",
    "https://wa.knfcs.com",
    *_cors_extra,
})
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-language",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

CSRF_TRUSTED_ORIGINS = [
    "https://knfcs.com",
    "https://www.knfcs.com",
    "https://api.knfcs.com",
    "https://wa.knfcs.com",
]

# ── Static files (Whitenoise) ─────────────────────────────────────────────────
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── Media Storage — Supabase S3-compatible bucket ────────────────────────────
# Supabase exposes an S3-compatible API so we can use django-storages/boto3.
# Set these four env vars in the Render dashboard (see .env for reference):
#   SUPABASE_S3_URL        — https://<ref>.supabase.co/storage/v1/s3
#   SUPABASE_S3_ACCESS_KEY — from Supabase Dashboard → Storage → S3 Access Keys
#   SUPABASE_S3_SECRET_KEY — from same page
#   SUPABASE_BUCKET        — bucket name you created (e.g. "knfc-media")
_supabase_s3_url = config("SUPABASE_S3_URL", default="")
if _supabase_s3_url:
    from urllib.parse import urlparse as _urlparse
    DEFAULT_FILE_STORAGE    = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_S3_ENDPOINT_URL     = _supabase_s3_url          # used for upload (S3 API)
    AWS_ACCESS_KEY_ID       = config("SUPABASE_S3_ACCESS_KEY", default="")
    AWS_SECRET_ACCESS_KEY   = config("SUPABASE_S3_SECRET_KEY", default="")
    AWS_STORAGE_BUCKET_NAME = config("SUPABASE_BUCKET", default="knfc-media")
    AWS_S3_REGION_NAME      = config("SUPABASE_S3_REGION", default="ap-southeast-2")
    AWS_DEFAULT_ACL         = None      # Supabase S3 does not support ACL headers
    AWS_S3_FILE_OVERWRITE   = False
    AWS_QUERYSTRING_AUTH    = False     # no signed tokens on public files
    AWS_S3_SIGNATURE_VERSION = "s3v4"

    # Supabase S3 endpoint:  https://ref.storage.supabase.co/storage/v1/s3
    # Supabase public URL:   https://ref.supabase.co/storage/v1/object/public/<bucket>/<key>
    # Strip ".storage" from the hostname to get the public CDN host.
    _s3_host   = _urlparse(_supabase_s3_url).netloc          # ref.storage.supabase.co
    _pub_host  = _s3_host.replace(".storage.supabase.co", ".supabase.co")
    AWS_S3_CUSTOM_DOMAIN = f"{_pub_host}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}"
    MEDIA_URL  = f"https://{AWS_S3_CUSTOM_DOMAIN}/"

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "utils.email_backend.IPv4EmailBackend"

# ── OTP — real WhatsApp OTP in production ─────────────────────────────────────
OTP_BYPASS = False

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
            "handlers":  ["console"],
            "level":     "ERROR",
            "propagate": False,
        },
        "daphne": {
            "handlers":  ["console"],
            "level":     "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers":  ["console"],
            "level":     "INFO",
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

TIME_ZONE = "Asia/Kolkata"
USE_TZ     = True
