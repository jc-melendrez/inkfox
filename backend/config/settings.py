"""Django settings for the FoxTutor backend.

Configuration is env-driven (see .env.example). Local dev and the school-project
deployment use SQLite; setting DATABASE_URL to a Postgres URL switches engines
with no code change. Avoid Postgres-only features so both engines work.
"""
import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
if not os.getenv("FOXTUTOR_TESTING"):
    load_dotenv(BASE_DIR / ".env")


def env_bool(key, default=False):
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key, default=None):
    items = [item.strip() for item in os.getenv(key, "").split(",") if item.strip()]
    return items or (list(default) if default else [])


def env_int(key, default):
    try:
        return int(os.getenv(key, str(default)))
    except (TypeError, ValueError):
        return default


# --- Core --------------------------------------------------------------------
# DEBUG defaults to off. With DEBUG off we refuse to boot without a real
# SECRET_KEY, so an accidental production run never uses a known key.
DEBUG = env_bool("DEBUG", False)

DEV_SECRET_KEY = "django-insecure-dev-only-change-me"
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = DEV_SECRET_KEY
    else:
        raise ImproperlyConfigured(
            "SECRET_KEY must be set when DEBUG is off. Generate one with:\n"
            '  python -c "from django.core.management.utils import '
            'get_random_secret_key as k; print(k())"'
        )
if not DEBUG and SECRET_KEY == DEV_SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY is still the development placeholder. Set a real SECRET_KEY."
    )

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "accounts",
    "materials",
    "questions",
    "essays",
    "feedback",
    "progress",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.csp.ContentSecurityPolicyMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database ----------------------------------------------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
    )
}
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    DATABASES["default"].setdefault("OPTIONS", {})["timeout"] = 30
    DATABASES["default"]["OPTIONS"].setdefault("init_command", "PRAGMA journal_mode=WAL;")

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- i18n --------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static / media ----------------------------------------------------------
STATIC_URL = "static/"
# Uploaded material files live outside the web root and are only ever read by the
# server (via authenticated views), never served directly.
MEDIA_ROOT = BASE_DIR / "media" / "private"

# --- Django REST Framework ---------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "common.authentication.ExpiringTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "common.renderers.CamelJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
        "djangorestframework_camel_case.parser.CamelCaseFormParser",
        "djangorestframework_camel_case.parser.CamelCaseMultiPartParser",
    ],
    "EXCEPTION_HANDLER": "common.errors.exception_handler",
    # No global throttles (so polling isn't penalised); views opt in by scope.
    "DEFAULT_THROTTLE_RATES": {
        "login": os.getenv("THROTTLE_LOGIN", "10/min"),
        "signup": os.getenv("THROTTLE_SIGNUP", "10/hour"),
        "ai": os.getenv("THROTTLE_AI", "30/day"),
    },
}

# --- Auth tokens -------------------------------------------------------------
TOKEN_TTL = timedelta(days=env_int("TOKEN_TTL_DAYS", 7))

# --- CORS --------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])
CORS_ALLOW_CREDENTIALS = False
# Let the SPA read the rotated token issued on login / password change.
CORS_EXPOSE_HEADERS = ["X-Auth-Token"]

# --- Security headers --------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
# API responses are JSON; a locked-down policy is pure defence in depth.
SECURE_CSP = {
    "default-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'none'"],
}
SECURE_CSP_REPORT_ONLY = {}

# --- Uploads -----------------------------------------------------------------
MAX_MATERIAL_SIZE = env_int("MAX_MATERIAL_SIZE", 10 * 1024 * 1024)  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_MATERIAL_SIZE
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_MATERIAL_SIZE + 2 * 1024 * 1024

# --- AI provider (see ai/) ---------------------------------------------------
AI_PROVIDER = os.getenv("AI_PROVIDER", "none").strip().lower()
AI_MODEL = os.getenv("AI_MODEL", "").strip()
AI_API_KEY = os.getenv("AI_API_KEY", "").strip()
AI_BASE_URL = os.getenv("AI_BASE_URL", "").strip()
AI_TIMEOUT = env_int("AI_TIMEOUT", 30)
AI_MAX_RETRIES = env_int("AI_MAX_RETRIES", 2)

# --- Cache (throttle counters) ----------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
