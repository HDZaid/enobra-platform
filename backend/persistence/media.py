"""Imágenes en default_storage (local o R2), con metadatos y auditoría en BD."""
import warnings
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.media.interfaces import MediaStorage
from .models.content import ContenidoPagina
from .support import read_data, write_data, audit
from .media_references import media_in_use
from apps.media.references import private_r2_enabled, media_api_data
from .private_media import is_public_media


class DjangoMediaStorage(MediaStorage):
    formats = {"JPEG": ("image/jpeg", "jpg"), "PNG": ("image/png", "png"),
               "WEBP": ("image/webp", "webp"), "GIF": ("image/gif", "gif")}

    def save(self, file, *, filename, content_type, size, kind, uploaded_by):
        if size <= 0 or size > settings.MEDIA_MAX_UPLOAD_BYTES:
            raise ValidationError({"file": "Tamaño de imagen inválido."})
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                file.seek(0)
                with Image.open(file) as img:
                    format_info = self.formats.get(img.format)
                    img.verify()
                if not format_info or format_info[0] != content_type:
                    raise ValueError
        except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
                Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise ValidationError({"file": "El contenido no corresponde a una imagen permitida."})
        file.seek(0)
        media_id = uuid4().hex
        path = default_storage.save(f"uploads/{media_id}.{format_info[1]}", file)
        url = f"/media/r2/{media_id}/" if private_r2_enabled() else default_storage.url(path)
        result = {"id": media_id, "url": url, "kind": kind,
            "content_type": content_type, "size": size, "created_at": timezone.now().isoformat(), "path": path}
        if private_r2_enabled():
            result["provider"] = "r2-private"
        try:
            with transaction.atomic():
                write_data("admin.media." + media_id, result, uploaded_by)
                obj = ContenidoPagina.objects.get(clave="admin.media." + media_id)
                audit("media", "CREAR", obj, uploaded_by)
        except Exception:
            default_storage.delete(path)
            raise
        return media_api_data(result)

    def get(self, media_id):
        return read_data("admin.media." + media_id) or None

    def is_public(self, item):
        return is_public_media(item)

    def open(self, item):
        return default_storage.open(item["path"], "rb")

    @transaction.atomic
    def delete(self, media_id, *, deleted_by=None):
        obj = ContenidoPagina.objects.select_for_update().filter(clave="admin.media." + media_id).first()
        if not obj:
            return False
        item = self.get(media_id)
        if media_in_use(item):
            raise ValidationError("La imagen está en uso. Retírala de las publicaciones o del contenido antes de eliminarla.")
        audit("media", "ELIMINAR", obj, deleted_by or obj.actualizado_por_id)
        obj.delete()
        transaction.on_commit(lambda: default_storage.delete(item["path"]))
        return True
