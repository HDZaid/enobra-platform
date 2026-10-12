from rest_framework import serializers

from apps.common.fields import GuatemalaPhoneField, MediaReferenceField


class CompanySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    person = serializers.CharField(max_length=160, help_text="Nombre del responsable (p. ej. Ing. Luis Bernardo Balcárcel López).")
    address = serializers.CharField(max_length=255)
    phones = serializers.ListField(child=GuatemalaPhoneField(), allow_empty=True)
    whatsapp = serializers.RegexField(r"^$|^502\d{8}$", allow_blank=True, help_text="Formato internacional sin '+': 502XXXXXXXX.")
    email = serializers.EmailField(allow_blank=True)
    instagram = serializers.URLField(allow_blank=True)
    facebook = serializers.URLField(allow_blank=True)
    domain = serializers.CharField(allow_blank=True, max_length=255)
    logo = MediaReferenceField(allow_blank=True)


class PrincipleSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120)
    description = serializers.CharField(max_length=500)


class InstitutionSerializer(serializers.Serializer):
    presentation = serializers.ListField(child=serializers.CharField(), help_text="Párrafos de la presentación.")
    signature = serializers.CharField(max_length=160)
    role = serializers.CharField(max_length=120)
    vision = serializers.CharField(help_text="Texto con saltos de línea (\\n\\n separa párrafos).")
    mission = serializers.CharField()
    principles = PrincipleSerializer(many=True)
