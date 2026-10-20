from datetime import date

from rest_framework import serializers

from apps.common.fields import MediaReferenceField, VideoReferenceField
from apps.common.serializers import AuditFieldsMixin


class ProjectSerializer(AuditFieldsMixin):
    """Salida (GET) de un proyecto."""

    id = serializers.SlugField(read_only=True)
    title = serializers.CharField()
    category = serializers.CharField(help_text="Ej.: Vivienda unifamiliar, Proyecto comercial, Remodelación.")
    country = serializers.CharField()
    year = serializers.IntegerField()
    description = serializers.CharField()
    images = serializers.ListField(child=serializers.CharField(), help_text="Fotografías (la primera es la portada).")
    renders = serializers.ListField(child=serializers.CharField())
    video = serializers.CharField(allow_blank=True)
    demo = serializers.BooleanField(help_text="True mientras el contenido sea un ejemplo no verificado.")
    published = serializers.BooleanField()


class ProjectWriteSerializer(serializers.Serializer):
    """Entrada (POST/PUT/PATCH) de un proyecto."""

    title = serializers.CharField(max_length=160)
    category = serializers.CharField(max_length=80)
    country = serializers.CharField(max_length=80, default="Guatemala")
    year = serializers.IntegerField(min_value=1900)
    description = serializers.CharField()
    images = serializers.ListField(child=MediaReferenceField(), min_length=1, max_length=40)
    renders = serializers.ListField(child=MediaReferenceField(), default=list, max_length=40)
    video = VideoReferenceField()
    demo = serializers.BooleanField(default=True)
    published = serializers.BooleanField(default=True)

    def validate_year(self, value):
        if value > date.today().year + 5:
            raise serializers.ValidationError("El año es demasiado lejano.")
        return value


class ProjectListQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False, help_text="Filtra por año.")
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)


class ProjectYearsSerializer(serializers.Serializer):
    years = serializers.ListField(child=serializers.IntegerField())
