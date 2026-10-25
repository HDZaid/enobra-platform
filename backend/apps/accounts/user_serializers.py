from django.contrib.auth.password_validation import (
    CommonPasswordValidator, MinimumLengthValidator, NumericPasswordValidator,
    UserAttributeSimilarityValidator, validate_password,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from persistence.models.access import Usuario
from .serializers import RoleSerializer


class ManagedUserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    active = serializers.BooleanField()
    roles = RoleSerializer(many=True)
    created_at = serializers.DateTimeField()


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=10, max_length=128)
    role_id = serializers.IntegerField(min_value=1)
    active = serializers.BooleanField(default=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        # Instancia sin guardar: el validador de similitud consulta los metadatos del modelo.
        user = Usuario(nombre=attrs['name'], correo=attrs['email'])
        try:
            validate_password(attrs['password'], user, password_validators=[
                MinimumLengthValidator(10), CommonPasswordValidator(), NumericPasswordValidator(),
                UserAttributeSimilarityValidator(user_attributes=('nombre', 'correo')),
            ])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages}) from None
        return attrs


class UserListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=150)
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12)


class UserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Envía al menos uno de: name, active.')
        return attrs


class UserRoleUpdateSerializer(serializers.Serializer):
    role_id = serializers.IntegerField(min_value=1)
