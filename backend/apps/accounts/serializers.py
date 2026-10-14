from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    roles = serializers.ListField(child=serializers.CharField())
    permissions = serializers.ListField(child=serializers.CharField())


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    expires_in = serializers.IntegerField(help_text="Segundos de vida del access token.")
    user = UserSerializer()


class AccessTokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    expires_in = serializers.IntegerField()


class PermissionSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_null=True)


class RoleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True, allow_null=True)
    active = serializers.BooleanField()
    permissions = serializers.ListField(child=serializers.CharField())


class RoleWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=60, required=True)
    description = serializers.CharField(max_length=250, allow_blank=True, required=False)
    active = serializers.BooleanField(required=False)
    permissions = serializers.ListField(
        child=serializers.CharField(max_length=100), required=True, allow_empty=True,
    )

    def validate_permissions(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("No se permiten permisos repetidos.")
        return value
