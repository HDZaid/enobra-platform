from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ResourcePermission
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import AuthService
from .serializers import (
    AccessTokenSerializer,
    LoginSerializer,
    PermissionSerializer,
    RefreshSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    TokenPairSerializer,
    UserSerializer,
)
from .interfaces import AccessControlRepository

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


ROLES_READ = ("roles.read", "roles.manage")


class PermissionListView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"GET": ROLES_READ}
    read_public = False

    @extend_schema(
        responses=PermissionSerializer(many=True),
        tags=["Roles y permisos"],
        summary="Permisos configurados para asignar a roles",
    )
    def get(self, request):
        return Response(PermissionSerializer(
            resolve(AccessControlRepository).list_permissions(), many=True
        ).data)


class RoleListCreateView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"GET": ROLES_READ, "POST": ("roles.manage",)}
    read_public = False

    @extend_schema(
        responses=RoleSerializer(many=True),
        tags=["Roles y permisos"],
        summary="Listar roles y permisos asignados",
    )
    def get(self, request):
        return Response(RoleSerializer(resolve(AccessControlRepository).list_roles(), many=True).data)

    @extend_schema(
        request=RoleWriteSerializer,
        responses={201: RoleSerializer, 400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer},
        tags=["Roles y permisos"],
        summary="Crear un rol a partir de permisos existentes",
    )
    def post(self, request):
        serializer = RoleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = resolve(AccessControlRepository).create_role(
            serializer.validated_data, actor_id=request.user.id, actor=request.user
        )
        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"GET": ROLES_READ, "PATCH": ("roles.manage",)}
    read_public = False

    @extend_schema(
        responses={200: RoleSerializer, 404: ErrorSerializer},
        tags=["Roles y permisos"],
        summary="Consultar un rol",
    )
    def get(self, request, role_id: int):
        role = resolve(AccessControlRepository).get_role(role_id)
        if role is None:
            raise NotFound("Rol no encontrado.")
        return Response(RoleSerializer(role).data)

    @extend_schema(
        request=RoleWriteSerializer(partial=True),
        responses={200: RoleSerializer, 400: ErrorSerializer, 404: ErrorSerializer},
        tags=["Roles y permisos"],
        summary="Actualizar nombre, estado o permisos de un rol",
    )
    def patch(self, request, role_id: int):
        serializer = RoleWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = resolve(AccessControlRepository).update_role(
            role_id, serializer.validated_data, actor_id=request.user.id, actor=request.user
        )
        if role is None:
            raise NotFound("Rol no encontrado.")
        return Response(RoleSerializer(role).data)
