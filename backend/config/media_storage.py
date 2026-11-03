"""Selección de almacenamiento local o R2 sin credenciales en el código."""
import re

from django.core.exceptions import ImproperlyConfigured


def r2_options(environ, *, require_public_host=True):
    names = ("R2_BUCKET_NAME", "R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")
    values = {name: environ.get(name, "").strip() for name in names}
    missing = [name for name, value in values.items() if not value]
    if missing:
        raise ImproperlyConfigured("Faltan variables de R2: " + ", ".join(missing))

    endpoint = values["R2_ENDPOINT_URL"].rstrip("/")
    if not re.fullmatch(
        r"https://[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com", endpoint
    ):
        raise ImproperlyConfigured("R2_ENDPOINT_URL debe ser el endpoint HTTPS de la cuenta, sin el bucket.")

    host = environ.get("R2_PUBLIC_HOST", "").strip().lower()
    if require_public_host:
        if not re.fullmatch(
            r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
            r"[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?", host
        ):
            raise ImproperlyConfigured(
                "R2_PUBLIC_HOST requiere el hostname público de imágenes, sin https://, puerto ni ruta. "
                "Mantén R2_ENABLED=false hasta configurar el dominio."
            )

    return {
        "bucket_name": values["R2_BUCKET_NAME"],
        "endpoint_url": endpoint,
        "access_key": values["R2_ACCESS_KEY_ID"],
        "secret_key": values["R2_SECRET_ACCESS_KEY"],
        "region_name": "auto",
        "signature_version": "s3v4",
        "addressing_style": "path",
        "custom_domain": host or None,
        "url_protocol": "https:",
        "default_acl": None,
        "querystring_auth": False,
        "file_overwrite": False,
    }


def media_storage_settings(environ):
    enabled = environ.get("R2_ENABLED", "false").strip().lower()
    if enabled not in ("true", "false"):
        raise ImproperlyConfigured("R2_ENABLED debe ser true o false.")
    storages = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    if enabled == "true":
        storages["default"] = {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": r2_options(environ),
        }
    return storages
