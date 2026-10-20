import re
from urllib.parse import urlsplit, parse_qs

from rest_framework import serializers

_HTTPS = re.compile(r"^https://\S+$", re.I)
_MEDIA_PATH = re.compile(r"^/media/[\w./-]+$")


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
    """Enlace HTTPS de YouTube. Cadena vacía = sin video."""

    def __init__(self, **kwargs):
        kwargs.setdefault("allow_blank", True)
        kwargs.setdefault("required", False)
        kwargs.setdefault("default", "")
        kwargs.setdefault("max_length", 500)
        kwargs.setdefault("help_text", "Enlace HTTPS de YouTube; cadena vacía para quitar el video.")
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not value:
            return value
        try:
            url = urlsplit(value)
            video_id = ""
            if url.scheme == "https" and not url.username and not url.password and url.port in (None, 443):
                if url.hostname in ("youtube.com", "www.youtube.com", "m.youtube.com"):
                    if url.path == "/watch":
                        video_id = parse_qs(url.query).get("v", [""])[0]
                    elif url.path.startswith(("/embed/", "/shorts/")):
                        video_id = url.path.split("/")[-1]
                elif url.hostname == "youtu.be":
                    video_id = url.path[1:]
            valid = re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id)
        except ValueError:
            valid = False
        if not valid:
            raise serializers.ValidationError("Usa un enlace HTTPS válido de YouTube.")
        return value


class GuatemalaPhoneField(serializers.CharField):
    """Teléfono de Guatemala de 8 dígitos. Acepta espacios y guiones; normaliza a 8 dígitos."""

    def to_internal_value(self, data):
        value = re.sub(r"[\s-]", "", super().to_internal_value(data))
        if not re.fullmatch(r"\d{8}", value):
            raise serializers.ValidationError("Ingresa un teléfono de Guatemala de 8 dígitos.")
        return value
