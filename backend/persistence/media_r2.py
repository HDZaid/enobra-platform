"""Imágenes en Cloudflare R2. Se activa con MEDIA_STORAGE_BACKEND=r2.

Valida el contenido con Pillow y guarda en la base solo los metadatos: `url`
(https) y `path` (clave del objeto en R2). Las credenciales llegan por variables
de entorno; nunca van al repositorio.
"""
import logging
from urllib.parse import urlsplit
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files import File
from django.db import transaction
from django.utils import timezone
from storages.backends.s3 import S3Storage

from .media import DjangoMediaStorage
from .models.content import ContenidoPagina
from .support import audit, write_data

logger = logging.getLogger(__name__)


def ensure_configured():
    required = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET", "R2_PUBLIC_BASE_URL")
    missing = [name for name in required if not getattr(settings, name, "")]
    if missing:
        raise ImproperlyConfigured("Faltan variables de R2: " + ", ".join(missing))
    url = settings.R2_PUBLIC_BASE_URL
    try:
        parsed = urlsplit(url)
        valid = (url.startswith("https://") and parsed.hostname
                 and parsed.username is None and parsed.password is None
                 and "?" not in url and "#" not in url
                 and not parsed.hostname.lower().rstrip(".").endswith(".r2.dev")
                 and parsed.hostname.lower().rstrip(".") != "r2.dev")
    except ValueError:
        valid = False
    if not valid:
        raise ImproperlyConfigured(
            "R2_PUBLIC_BASE_URL requiere un dominio propio HTTPS, sin credenciales, "
            "consulta ni fragmento; r2.dev tiene límites y es solo para desarrollo.")


def build_s3_storage():
    return S3Storage(
        bucket_name=settings.R2_BUCKET,
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        access_key=settings.R2_ACCESS_KEY_ID,
        secret_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        signature_version="s3v4",
        default_acl=None,
        querystring_auth=False,
        file_overwrite=False,
        object_parameters={"CacheControl": "public, max-age=31536000, immutable"},
    )


def delete_quietly(storage, key):
    try:
        storage.delete(key)
    except Exception:  # noqa: BLE001 - el fallo remoto no debe romper la operación
        logger.error("No se pudo borrar la imagen en R2; clave=%s", key)


class R2MediaStorage(DjangoMediaStorage):
    def __init__(self, storage=None):
        ensure_configured()
        self.storage = storage or build_s3_storage()

    def save(self, file, *, filename, content_type, size, kind, uploaded_by):
        mime, ext = self.validated_format(file, content_type=content_type, size=size)
        file.seek(0)
        media_id = uuid4().hex
        key = f"uploads/{media_id}.{ext}"
        upload = File(file, name=key)
        upload.content_type = mime
        name = self.storage.save(key, upload)
        url = f"{settings.R2_PUBLIC_BASE_URL}/{name}"
        if not url.startswith("https://"):
            delete_quietly(self.storage, name)
            raise RuntimeError("R2 no devolvió una URL segura.")
        result = {"id": media_id, "url": url, "kind": kind, "content_type": content_type,
                  "size": size, "created_at": timezone.now().isoformat(),
                  "path": name, "provider": "r2"}
        try:
            with transaction.atomic():
                write_data("admin.media." + media_id, result, uploaded_by)
                obj = ContenidoPagina.objects.get(clave="admin.media." + media_id)
                audit("media", "CREAR", obj, uploaded_by)
        except Exception:
            delete_quietly(self.storage, name)
            raise
        return result

    @transaction.atomic
    def delete(self, media_id, *, deleted_by=None):
        obj = ContenidoPagina.objects.select_for_update().filter(clave="admin.media." + media_id).first()
        if not obj:
            return False
        item = self.get(media_id)
        audit("media", "ELIMINAR", obj, deleted_by or obj.actualizado_por_id)
        obj.delete()
        if item.get("provider") == "r2":
            transaction.on_commit(lambda: delete_quietly(self.storage, item["path"]))
        return True
