from datetime import date

from rest_framework import serializers

from apps.common.enums import InquiryKind, InquiryStatus
from apps.common.fields import GuatemalaPhoneField


class ContactInquiryCreateSerializer(serializers.Serializer):
    """Formulario de Contacto / 'Solicitar información' de Servicios."""

    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(max_length=150)
    phone = GuatemalaPhoneField()
    subject = serializers.CharField(
        max_length=80, help_text="Título de un servicio (Diseño, Construcción…), 'Bienes raíces' u 'Otro'."
    )
    message = serializers.CharField(max_length=2000)
    website = serializers.CharField(
        required=False, allow_blank=True, write_only=True,
        help_text="Honeypot anti-spam: debe enviarse vacío (campo oculto en el formulario).",
    )

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError("Solicitud rechazada.")
        return value


class VisitInquiryCreateSerializer(serializers.Serializer):
    """Modal 'Solicitar visita' de una propiedad."""

    property_id = serializers.IntegerField(min_value=1)
    name = serializers.CharField(max_length=120)
    phone = GuatemalaPhoneField()
    preferred_date = serializers.DateField(help_text="Hoy o una fecha futura.")

    def validate_preferred_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Elige hoy o una fecha futura.")
        return value


class InquiryReceiptSerializer(serializers.Serializer):
    """Acuse que recibe el visitante público."""

    id = serializers.CharField()
    status = serializers.ChoiceField(choices=InquiryStatus.choices)
    created_at = serializers.DateTimeField()


class InquirySerializer(serializers.Serializer):
    """Vista del administrador."""

    id = serializers.CharField()
    kind = serializers.ChoiceField(choices=InquiryKind.choices)
    status = serializers.ChoiceField(choices=InquiryStatus.choices)
    name = serializers.CharField()
    email = serializers.EmailField(allow_blank=True, allow_null=True)
    phone = serializers.CharField()
    subject = serializers.CharField(allow_blank=True, allow_null=True)
    message = serializers.CharField(allow_blank=True, allow_null=True)
    property_id = serializers.IntegerField(allow_null=True)
    property_title = serializers.CharField(allow_null=True)
    preferred_date = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    updated_by = serializers.CharField(allow_null=True)


class InquiryStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=InquiryStatus.choices)


class InquiryListQuerySerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=InquiryKind.choices, required=False)
    status = serializers.ChoiceField(choices=InquiryStatus.choices, required=False)
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)
