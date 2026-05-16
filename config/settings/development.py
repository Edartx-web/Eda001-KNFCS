"""
Development settings.
Usage: set DJANGO_SETTINGS_MODULE=config.settings.development
"""

from .base import *

# ─── Debug ────────────────────────────────────────────────────────────────────
DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "192.168.1.37",
    "192.168.1.38",
    "knfcs.com",
    "www.knfcs.com",
    "api.knfcs.com",
    "*.knfcs.com",
]

# Trust Cloudflare Tunnels/Reverse Proxy headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True


# ─── Database (local PostgreSQL) ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config("DB_NAME",     default="knfc_db"),
        'USER': config("DB_USER",     default="knfc_user"),
        'PASSWORD': config("DB_PASSWORD", default=""),
        'HOST': config("DB_HOST",     default="127.0.0.1"),
        'PORT': config("DB_PORT",     default="5432"),
    }
}


# ─── Celery (Windows: solo pool avoids fork() issues) ────────────────────────
CELERY_WORKER_POOL = "solo"

# ─── OTP Dev Bypass ───────────────────────────────────────────────────────────
# When True, any OTP input is accepted without calling 2Factor.in
# Set to False before deploying to production
OTP_BYPASS     = False
OTP_BYPASS_CODE = "123456"


# ─── Email ────────────────────────────────────────────────────────────────────
# Auto-switch: SMTP when real credentials are in .env, console otherwise
_email_user = config("EMAIL_HOST_USER", default="")
_email_pass = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if _email_user and _email_user not in ("", "yourshop@gmail.com")
       and _email_pass and _email_pass not in ("", "your_app_password")
    else "django.core.mail.backends.console.EmailBackend"
)


# ─── CORS (allow React dev server & custom domains) ──────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://192.168.1.38:3000",
    "https://knfcs.com",
    "https://www.knfcs.com",
    "https://api.knfcs.com",
]

CSRF_TRUSTED_ORIGINS = [
    "http://192.168.1.38:3000",
    "https://knfcs.com",
    "https://www.knfcs.com",
    "https://api.knfcs.com",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# ─── Cache & Channels (in-memory — no Redis required in dev) ─────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True
# ─── Django Debug Toolbar (optional, install separately) ─────────────────────
# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
# INTERNAL_IPS = ["127.0.0.1"]
