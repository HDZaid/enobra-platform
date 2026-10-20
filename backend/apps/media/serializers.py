from django.conf import settings
from rest_framework import serializers

from apps.common.enums import MediaKind


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    kind = serializers.ChoiceField(choices=MediaKind.choices, default=MediaKind.PHOTO)

    def validate_file(self, f):
        if f.content_type not in settings.MEDIA_ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError("Formato no permitido. Usa JPEG, PNG, WebP o GIF.")
        if f.size > settings.MEDIA_MAX_UPLOAD_BYTES:
            mb = settings.MEDIA_MAX_UPLOAD_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f"La imagen supera el máximo de {mb} MB.")
        return f


class MediaSerializer(serializers.Serializer):
    id = serializers.CharField()
    url = serializers.CharField(help_text="Úsala tal cual en `images`, `renders`, `image` o `logo`.")
    kind = serializers.ChoiceField(choices=MediaKind.choices)
    content_type = serializers.CharField()
    size = serializers.IntegerField()
    created_at = serializers.DateTimeField()
