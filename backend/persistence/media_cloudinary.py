"""Imágenes en Cloudinary (plan gratuito). Se activa con MEDIA_STORAGE_BACKEND=cloudinary.

Reutiliza la validación de DjangoMediaStorage (tamaño y contenido real con Pillow) y
guarda en la base solo metadatos: `url` (https) y `public_id` (clave del proveedor).
Las credenciales llegan por la variable CLOUDINARY_URL; nunca van al repositorio.
"""
import logging
from uuid import uuid4

import cloudinary
import cloudinary.uploader
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone

from .media import DjangoMediaStorage
from .models.content import ContenidoPagina
from .support import audit, write_data

logger = logging.getLogger(__name__)
FOLDER = "enobra"


def ensure_configured():
    config = cloudinary.config(secure=True)
    if not (config.cloud_name and config.api_key and config.api_secret):
        raise ImproperlyConfigured(
            "MEDIA_STORAGE_BACKEND=cloudinary requiere la variable CLOUDINARY_URL "
            "(cloudinary://API_KEY:API_SECRET@CLOUD_NAME).")


def destroy_quietly(public_id):
    try:
        cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
    except Exception:  # noqa: BLE001 - el archivo huérfano no debe romper la operación
        logger.error("No se pudo borrar la imagen en Cloudinary; public_id=%s", public_id)


class CloudinaryMediaStorage(DjangoMediaStorage):
    def __init__(self):
        ensure_configured()

    def save(self, file, *, filename, content_type, size, kind, uploaded_by):
        self.validated_format(file, content_type=content_type, size=size)
        file.seek(0)
        media_id = uuid4().hex
        uploaded = cloudinary.uploader.upload(
            file, public_id=media_id, folder=FOLDER, resource_type="image",
            overwrite=False, unique_filename=False, use_filename=False)
        url, public_id = uploaded.get("secure_url", ""), uploaded.get("public_id", "")
        if not url.startswith("https://") or not public_id:
            destroy_quietly(public_id or f"{FOLDER}/{media_id}")
            raise RuntimeError("Cloudinary no devolvió una URL segura.")
        result = {"id": media_id, "url": url, "kind": kind, "content_type": content_type,
                  "size": size, "created_at": timezone.now().isoformat(),
                  "path": public_id, "provider": "cloudinary"}
        try:
            with transaction.atomic():
                write_data("admin.media." + media_id, result, uploaded_by)
                obj = ContenidoPagina.objects.get(clave="admin.media." + media_id)
                audit("media", "CREAR", obj, uploaded_by)
        except Exception:
            destroy_quietly(public_id)
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
        if item.get("provider") == "cloudinary":
            transaction.on_commit(lambda: destroy_quietly(item["path"]))
        return True
