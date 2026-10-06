from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import AuthService
from .serializers import (
    AccessTokenSerializer,
    LoginSerializer,
    RefreshSerializer,
    TokenPairSerializer,
    UserSerializer,
)

TAG = ["Autenticación"]


class InvalidCredentials(APIException):
    """401 explícito (DRF lo convertiría en 403 en vistas sin autenticadores)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Credenciales inválidas."
    default_code = "invalid_credentials"


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "login"

    @extend_schema(
        request=LoginSerializer,
        responses={200: TokenPairSerializer, 401: ErrorSerializer},
        tags=TAG,
        summary="Iniciar sesión (panel de administración)",
    )
    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = resolve(AuthService).login(**data.validated_data)
        if result is None:
            raise InvalidCredentials("Correo o contraseña incorrectos.")
        return Response(TokenPairSerializer(result).data)


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        request=RefreshSerializer,
        responses={200: AccessTokenSerializer, 401: ErrorSerializer},
        tags=TAG,
        summary="Renovar access token",
    )
    def post(self, request):
        data = RefreshSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        result = resolve(AuthService).refresh(data.validated_data["refresh"])
        if result is None:
            raise InvalidCredentials("Refresh token inválido o expirado.")
        return Response(AccessTokenSerializer(result).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        request=RefreshSerializer, responses={204: None}, tags=TAG, summary="Cerrar sesión (revoca el refresh)"
    )
    def post(self, request):
        data = RefreshSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        resolve(AuthService).logout(data.validated_data["refresh"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer, 401: ErrorSerializer}, tags=TAG, summary="Usuario autenticado actual"
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)
