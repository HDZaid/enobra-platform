from rest_framework import serializers

from apps.common.enums import Operation, PropertySort, PropertyType
from apps.common.fields import MediaReferenceField, VideoReferenceField
from apps.common.serializers import AuditFieldsMixin


class PropertySerializer(AuditFieldsMixin):
    """Salida (GET) de una propiedad."""

    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField()
    operation = serializers.ChoiceField(choices=Operation.choices)
    type = serializers.ChoiceField(choices=PropertyType.choices)
    zone = serializers.CharField(help_text="Ej.: Zona 9")
    location = serializers.CharField(help_text="Ej.: Quetzaltenango")
    price = serializers.IntegerField(help_text="Quetzales. En Alquiler es el monto mensual.")
    rooms = serializers.IntegerField()
    baths = serializers.IntegerField()
    parking = serializers.IntegerField()
    area = serializers.IntegerField(help_text="m². En Terreno es la superficie del terreno.")
    date = serializers.DateField(help_text="Fecha de publicación (ordena 'más recientes').")
    description = serializers.CharField()
    commercial = serializers.CharField(help_text="Especificaciones comerciales (precio, condiciones, documentación).")
    images = serializers.ListField(child=serializers.CharField())
    renders = serializers.ListField(child=serializers.CharField())
    video = serializers.CharField(allow_blank=True)
    demo = serializers.BooleanField()
    published = serializers.BooleanField()


class PropertyWriteSerializer(serializers.Serializer):
    """Entrada (POST/PUT/PATCH) de una propiedad."""

    title = serializers.CharField(max_length=160)
    operation = serializers.ChoiceField(choices=Operation.choices)
    type = serializers.ChoiceField(choices=PropertyType.choices)
    zone = serializers.CharField(max_length=60)
    location = serializers.CharField(max_length=120)
    price = serializers.IntegerField(min_value=0)
    rooms = serializers.IntegerField(min_value=0, default=0)
    baths = serializers.IntegerField(min_value=0, default=0)
    parking = serializers.IntegerField(min_value=0, default=0)
    area = serializers.IntegerField(min_value=1)
    date = serializers.DateField()
    description = serializers.CharField()
    commercial = serializers.CharField()
    images = serializers.ListField(child=MediaReferenceField(), min_length=1, max_length=40)
    renders = serializers.ListField(child=MediaReferenceField(), default=list, max_length=40)
    video = VideoReferenceField()
    demo = serializers.BooleanField(default=True)
    published = serializers.BooleanField(default=True)

    def validate(self, attrs):
        # Un terreno no tiene habitaciones, baños ni parqueos.
        if attrs.get("type") == PropertyType.TERRENO and any(attrs.get(k) for k in ("rooms", "baths", "parking")):
            raise serializers.ValidationError("Un terreno no puede tener habitaciones, baños ni parqueos.")
        return attrs


class PropertyListQuerySerializer(serializers.Serializer):
    operation = serializers.ChoiceField(choices=Operation.choices, required=False)
    type = serializers.ChoiceField(choices=PropertyType.choices, required=False)
    zone = serializers.CharField(required=False)
    min_price = serializers.IntegerField(min_value=0, required=False)
    max_price = serializers.IntegerField(min_value=0, required=False)
    q = serializers.CharField(required=False, allow_blank=True, default="")
    ids = serializers.CharField(required=False, help_text="Ids separados por coma (vista 'Favoritos'). Ej.: 1,4,5")
    sort = serializers.ChoiceField(choices=PropertySort.choices, default=PropertySort.RECENT, required=False)
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)

    def validate_ids(self, value):
        try:
            return [int(x) for x in value.split(",") if x.strip()]
        except ValueError:
            raise serializers.ValidationError("`ids` debe ser una lista de enteros separados por coma.")

    def validate(self, attrs):
        lo, hi = attrs.get("min_price"), attrs.get("max_price")
        if lo is not None and hi is not None and lo > hi:
            raise serializers.ValidationError("min_price no puede ser mayor que max_price.")
        return attrs


class PropertyFacetsSerializer(serializers.Serializer):
    operations = serializers.ListField(child=serializers.CharField())
    types = serializers.ListField(child=serializers.CharField())
    zones = serializers.ListField(child=serializers.CharField(), help_text="Zonas con propiedades (llena el <select> de zona).")
    min_price = serializers.IntegerField(allow_null=True)
    max_price = serializers.IntegerField(allow_null=True)
