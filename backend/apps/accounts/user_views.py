from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import HasAnyPermission, IsAdmin
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer
from .interfaces import UserRepository
from .serializers import RoleSerializer
from .user_serializers import (ManagedUserSerializer, UserCreateSerializer, UserListQuerySerializer,
    UserUpdateSerializer, UserRoleUpdateSerializer)


class UserListCreateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(parameters=[UserListQuerySerializer], responses={200: paginated(ManagedUserSerializer),
        401: ErrorSerializer, 403: ErrorSerializer}, tags=['Usuarios (admin)'], summary='Consultar usuarios del panel')
    def get(self, request):
        query = UserListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        result = resolve(UserRepository).list(q=params.get('q', ''), page=params['page'], page_size=params['page_size'])
        return paginated_response(result, params, ManagedUserSerializer)

    @extend_schema(request=UserCreateSerializer, responses={201: ManagedUserSerializer,
        400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer},
        tags=['Usuarios (admin)'], summary='Crear usuario y asignar un rol activo (administrador)')
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = resolve(UserRepository).create(serializer.validated_data, actor_id=request.user.id)
        return Response(ManagedUserSerializer(result).data, status=status.HTTP_201_CREATED)


class UserRoleOptionsView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: RoleSerializer(many=True), 401: ErrorSerializer, 403: ErrorSerializer},
        tags=['Usuarios (admin)'], summary='Roles activos disponibles para crear usuarios')
    def get(self, request):
        return Response(RoleSerializer(resolve(UserRepository).role_options(), many=True).data)


USER_ERRORS = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer, 404: ErrorSerializer}


class UserDetailView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ('users.manage',)

    @extend_schema(request=UserUpdateSerializer, responses={200: ManagedUserSerializer, **USER_ERRORS},
        tags=['Usuarios (admin)'], summary='Editar nombre o estado de un usuario',
        description='Requiere `users.manage`. Nadie puede desactivarse a sí mismo ni desactivar '
                    'al último Ingeniero activo.')
    def patch(self, request, user_id: int):
        serializer = UserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = resolve(UserRepository).update(user_id, serializer.validated_data, actor_id=request.user.id)
        if result is None:
            raise NotFound('Usuario no encontrado.')
        return Response(ManagedUserSerializer(result).data)


class UserRoleView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ('users.manage',)

    @extend_schema(request=UserRoleUpdateSerializer, responses={200: ManagedUserSerializer, **USER_ERRORS},
        tags=['Usuarios (admin)'], summary='Reemplazar el rol de un usuario',
        description='Requiere `users.manage`. Reemplaza el rol actual por `role_id` (un usuario, un rol). '
                    'El rol debe estar activo y no puede otorgar permisos que quien lo asigna no tenga.')
    def put(self, request, user_id: int):
        serializer = UserRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = resolve(UserRepository).replace_role(user_id, serializer.validated_data['role_id'], actor=request.user)
        if result is None:
            raise NotFound('Usuario no encontrado.')
        return Response(ManagedUserSerializer(result).data)
