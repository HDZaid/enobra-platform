"""Imágenes locales con metadatos en BD. Configurar almacenamiento duradero en despliegue."""
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


class DjangoMediaStorage(MediaStorage):
    formats = {"JPEG": ("image/jpeg", "jpg"), "PNG": ("image/png", "png"),
               "WEBP": ("image/webp", "webp"), "GIF": ("image/gif", "gif")}

    def validated_format(self, file, *, content_type, size):
        """Valida tamaño y contenido real de la imagen. -> (mime, extension)."""
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
        return format_info

    def save(self, file, *, filename, content_type, size, kind, uploaded_by):
        format_info = self.validated_format(file, content_type=content_type, size=size)
        file.seek(0)
        media_id = uuid4().hex
        path = default_storage.save(f"uploads/{media_id}.{format_info[1]}", file)
        result = {"id": media_id, "url": default_storage.url(path), "kind": kind,
            "content_type": content_type, "size": size, "created_at": timezone.now().isoformat(), "path": path}
        try:
            with transaction.atomic():
                write_data("admin.media." + media_id, result, uploaded_by)
                obj = ContenidoPagina.objects.get(clave="admin.media." + media_id)
                audit("media", "CREAR", obj, uploaded_by)
        except Exception:
            default_storage.delete(path)
            raise
        return result

    def get(self, media_id):
        return read_data("admin.media." + media_id) or None

    @transaction.atomic
    def delete(self, media_id, *, deleted_by=None):
        obj = ContenidoPagina.objects.select_for_update().filter(clave="admin.media." + media_id).first()
        if not obj:
            return False
        item = self.get(media_id)
        audit("media", "ELIMINAR", obj, deleted_by or obj.actualizado_por_id)
        obj.delete()
        transaction.on_commit(lambda: default_storage.delete(item["path"]))
        return True
