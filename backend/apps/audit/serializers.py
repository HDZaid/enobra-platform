from rest_framework import serializers

from apps.common.pagination import PageQuerySerializer


class AuditFilterSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1, required=False)
    module = serializers.CharField(max_length=60, required=False)
    action = serializers.CharField(max_length=50, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    q = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if (attrs.get("date_from") and attrs.get("date_to")
                and attrs["date_from"] > attrs["date_to"]):
            raise serializers.ValidationError({"date_to": "Debe ser igual o posterior a date_from."})
        return attrs


class AuditQuerySerializer(AuditFilterSerializer, PageQuerySerializer):
    pass


class AuditUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class AuditSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user = AuditUserSerializer()
    action = serializers.CharField()
    module = serializers.CharField()
    record_id = serializers.IntegerField(allow_null=True)
    record_name = serializers.CharField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    date = serializers.DateTimeField()
