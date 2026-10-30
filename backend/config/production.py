"""Configuración HTTP de producción; activar con DJANGO_SETTINGS_MODULE=config.production."""
from urllib.parse import urlsplit

from .settings import *  # noqa: F403
from .settings import os, env_list, require_production_secret
from django.core.exceptions import ImproperlyConfigured

DEBUG = False
require_production_secret(SECRET_KEY)  # noqa: F405

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS or any(
        host.startswith(".") or any(char in host for char in ("/", ":", "*", " "))
        or host in ("localhost", "127.0.0.1") for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS debe contener los dominios reales de la API, sin esquema ni comodines.")


def https_origin(value):
    try:
        parsed = urlsplit(value)
        # Acceder al puerto también valida puertos mal formados.
        parsed.port
        return (parsed.scheme == "https" and bool(parsed.hostname)
                and parsed.hostname not in ("localhost", "127.0.0.1", "::1")
                and not parsed.username and not parsed.password
                and not parsed.path and not parsed.query and not parsed.fragment
                and "*" not in parsed.netloc)
    except ValueError:
        return False


CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
if (not CORS_ALLOWED_ORIGINS or not all(map(https_origin, CORS_ALLOWED_ORIGINS))
        or not https_origin(FRONTEND_BASE_URL)
        or FRONTEND_BASE_URL not in CORS_ALLOWED_ORIGINS):
    raise ImproperlyConfigured("Configura CORS_ALLOWED_ORIGINS y FRONTEND_BASE_URL con los orígenes HTTPS reales del frontend.")
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = False  # La API usa Bearer; no cookies de sesión entre sitios.

MIDDLEWARE = [*MIDDLEWARE,  # noqa: F405
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https")
    if os.getenv("DJANGO_TRUST_PROXY_SSL_HEADER", "false").strip().lower() == "true"
    else None
)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 3600
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
