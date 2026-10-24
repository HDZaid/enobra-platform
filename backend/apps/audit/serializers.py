from rest_framework import serializers


class AuditQuerySerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, min_value=1, help_text="Usuario que realizó la acción.")
    module = serializers.CharField(required=False, max_length=60, help_text="Ej.: properties, projects, users, roles.")
    action = serializers.CharField(required=False, max_length=50, help_text="Ej.: CREAR, EDITAR, PAPELERA.")
    date_from = serializers.DateField(required=False, help_text="Desde (inclusive), zona America/Guatemala.")
    date_to = serializers.DateField(required=False, help_text="Hasta (inclusive), zona America/Guatemala.")
    q = serializers.CharField(required=False, allow_blank=True, max_length=150,
                              help_text="Busca en el nombre del registro y la descripción.")

    def validate(self, attrs):
        start, end = attrs.get("date_from"), attrs.get("date_to")
        if start and end and start > end:
            raise serializers.ValidationError({"date_to": "Debe ser igual o posterior a date_from."})
        return attrs


class AuditListQuerySerializer(AuditQuerySerializer):
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)


class AuditUserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class AuditEntrySerializer(serializers.Serializer):
    id = serializers.CharField()
    user = AuditUserSerializer()
    action = serializers.CharField()
    module = serializers.CharField()
    record_id = serializers.CharField(allow_null=True)
    record_name = serializers.CharField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    date = serializers.DateTimeField()
