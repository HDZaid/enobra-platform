"""
Configuración de EnObra API.

IMPORTANTE: este proyecto define SOLO contratos. No hay base de datos configurada,
ni django.contrib.auth / sessions / admin (todos requieren BD). Cuando se acople la
base de datos se añadirá DATABASES y la capa de persistencia (ver README).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    # Apps de dominio (solo contratos)
    "apps.common.apps.CommonConfig",
    "apps.accounts",
    "apps.company",
    "apps.services",
    "apps.projects",
    "apps.properties",
    "apps.news",
    "apps.inquiries",
    "apps.search",
    "apps.media",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]

# Sin base de datos todavía (se acopla después). Django usará el backend "dummy".
DATABASES: dict = {}

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Guatemala"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS (frontend React) ---------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")

# --- Medios ------------------------------------------------------------------
MEDIA_MAX_UPLOAD_BYTES = int(os.getenv("MEDIA_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
MEDIA_ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
DATA_UPLOAD_MAX_MEMORY_SIZE = MEDIA_MAX_UPLOAD_BYTES + 1024 * 1024

# --- Django REST Framework ---------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.BearerTokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["apps.common.permissions.IsAdminOrReadOnly"],
    "UNAUTHENTICATED_USER": None,  # sin django.contrib.auth
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.errors.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",        # POST /auth/login/
        "inquiries": "10/hour",  # POST /inquiries/contact/ y /inquiries/visits/
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "EnObra API",
    "DESCRIPTION": (
        "Contrato HTTP del backend de EnObra (constructora y bienes raíces, Quetzaltenango). "
        "Todas las rutas cuelgan de /api/v1/. Los endpoints de escritura requieren "
        "`Authorization: Bearer <access_token>` con rol admin."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "OperationEnum": "apps.common.enums.Operation.choices",
        "PropertyTypeEnum": "apps.common.enums.PropertyType.choices",
        "NewsCategoryEnum": "apps.common.enums.NewsCategory.choices",
        "InquiryStatusEnum": "apps.common.enums.InquiryStatus.choices",
        "InquiryKindEnum": "apps.common.enums.InquiryKind.choices",
        "MediaKindEnum": "apps.common.enums.MediaKind.choices",
        "RoleEnum": "apps.common.enums.Role.choices",
    },
}
