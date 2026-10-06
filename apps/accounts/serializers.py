from rest_framework import serializers

from apps.common.enums import Role


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Role.choices)


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    expires_in = serializers.IntegerField(help_text="Segundos de vida del access token.")
    user = UserSerializer()


class AccessTokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    expires_in = serializers.IntegerField()
