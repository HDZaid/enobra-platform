import re

from rest_framework import serializers

_HTTPS = re.compile(r"^https://\S+$", re.I)
_MEDIA_PATH = re.compile(r"^/media/[\w./-]+$")
_VIDEO = re.compile(r"^(https://\S+|/media/[\w./-]+)\.(mp4|webm)(\?\S*)?$", re.I)


class MediaReferenceField(serializers.CharField):
    """URL HTTPS o ruta /media/... (nunca data: URIs; las imágenes se suben por POST /admin/media/)."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 500)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not (_HTTPS.match(value) or _MEDIA_PATH.match(value)):
            raise serializers.ValidationError("Usa una URL HTTPS o una ruta /media/… devuelta por la API.")
        return value


class VideoReferenceField(serializers.CharField):
    """Video MP4/WebM por URL HTTPS o ruta /media/... Cadena vacía = sin video."""

    def __init__(self, **kwargs):
        kwargs.setdefault("allow_blank", True)
        kwargs.setdefault("required", False)
        kwargs.setdefault("default", "")
        kwargs.setdefault("max_length", 500)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if value and not _VIDEO.match(value):
            raise serializers.ValidationError("El video debe ser MP4 o WebM (URL HTTPS o ruta /media/…).")
        return value


class GuatemalaPhoneField(serializers.CharField):
    """Teléfono de Guatemala de 8 dígitos. Acepta espacios y guiones; normaliza a 8 dígitos."""

    def to_internal_value(self, data):
        value = re.sub(r"[\s-]", "", super().to_internal_value(data))
        if not re.fullmatch(r"\d{8}", value):
            raise serializers.ValidationError("Ingresa un teléfono de Guatemala de 8 dígitos.")
        return value
