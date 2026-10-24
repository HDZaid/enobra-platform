from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.enums import Operation, PropertyType
from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import HasAnyPermission, ResourcePermission, has_permission, is_admin
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import PropertyFilters, PropertyRepository
from .serializers import (
    PropertyFacetsSerializer,
    PropertyListQuerySerializer,
    PropertySerializer,
    PropertyWriteSerializer,
)

TAG = ["Bienes raíces"]
ERR = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer}


PROPERTY_PERMISSIONS = {
    "POST": ("properties.create",),
    "PUT": ("properties.edit.any", "properties.edit.own"),
    "PATCH": ("properties.edit.any", "properties.edit.own"),
    "DELETE": ("properties.trash.any", "properties.trash.own"),
}


class PropertyAccessPermission(ResourcePermission):
    """Lectura pública y escritura con permisos específicos de propiedades."""

    permission_map = PROPERTY_PERMISSIONS


class PropertyListCreateView(APIView):
    permission_classes = [PropertyAccessPermission]

    @extend_schema(
        parameters=[PropertyListQuerySerializer],
        responses=paginated(PropertySerializer),
        tags=TAG,
        summary="Catálogo con filtros combinables, orden y paginación", operation_id="properties_list",
        description="Público: solo `published=true`. Con token admin se incluyen borradores.",
        auth=[],
    )
    def get(self, request):
        q = PropertyListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        p = q.validated_data
        p.setdefault("page", 1)
        p.setdefault("page_size", 12)
        can_see_all_drafts = is_admin(request) or has_permission(request.user, "properties.edit.any")
        can_see_own_drafts = has_permission(request.user, "properties.edit.own")
        owner_id = None
        if not can_see_all_drafts and can_see_own_drafts:
            owner_id = int(request.user.id)
        filters = PropertyFilters(
            operation=p.get("operation"),
            type=p.get("type"),
            zone=p.get("zone"),
            min_price=p.get("min_price"),
            max_price=p.get("max_price"),
            q=p.get("q", ""),
            ids=p.get("ids"),
            sort=p.get("sort", "recent"),
            include_unpublished=can_see_all_drafts or can_see_own_drafts,
            owner_id=owner_id,
        )
        page = resolve(PropertyRepository).list(filters, page=p["page"], page_size=p["page_size"])
        return paginated_response(page, p, PropertySerializer)

    @extend_schema(request=PropertyWriteSerializer, responses={201: PropertySerializer, **ERR}, tags=TAG, summary="Crear propiedad (admin)")
    def post(self, request):
        s = PropertyWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = dict(s.validated_data)
        if "published" in request.data and data["published"] and not has_permission(request.user, "properties.publish"):
            raise PermissionDenied("Tu rol solo puede crear borradores.")
        if not has_permission(request.user, "properties.publish"):
            data["published"] = False
        created = resolve(PropertyRepository).create(data, created_by=request.user.id)
        return Response(PropertySerializer(created).data, status=status.HTTP_201_CREATED)


class PropertyFacetsView(APIView):
    @extend_schema(responses=PropertyFacetsSerializer, tags=TAG, summary="Opciones para poblar los filtros", auth=[])
    def get(self, request):
        facets = resolve(PropertyRepository).facets(include_unpublished=is_admin(request))
        facets = {"operations": [c for c, _ in Operation.choices], "types": [c for c, _ in PropertyType.choices], **facets}
        return Response(PropertyFacetsSerializer(facets).data)


class PropertyDetailView(APIView):
    permission_classes = [PropertyAccessPermission]

    @extend_schema(responses={200: PropertySerializer, 404: ErrorSerializer}, tags=TAG, summary="Ficha de propiedad", operation_id="properties_retrieve", auth=[])
    def get(self, request, property_id: int):
        repository = resolve(PropertyRepository)
        can_see_all_drafts = is_admin(request) or has_permission(request.user, "properties.edit.any")
        include_unpublished = can_see_all_drafts
        if not include_unpublished and has_permission(request.user, "properties.edit.own"):
            include_unpublished = repository.is_own_draft(property_id, request.user.id)
        item = repository.get(property_id, include_unpublished=include_unpublished)
        if item is None:
            raise NotFound("Propiedad no encontrada.")
        return Response(PropertySerializer(item).data)

    @extend_schema(request=PropertyWriteSerializer, responses={200: PropertySerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Reemplazar propiedad (admin)")
    def put(self, request, property_id: int):
        return self._save(request, property_id, partial=False)

    @extend_schema(request=PropertyWriteSerializer(partial=True), responses={200: PropertySerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Editar propiedad parcialmente (admin)")
    def patch(self, request, property_id: int):
        return self._save(request, property_id, partial=True)

    def _save(self, request, property_id, *, partial):
        s = PropertyWriteSerializer(data=request.data, partial=partial)
        s.is_valid(raise_exception=True)
        repository = resolve(PropertyRepository)
        can_edit_any = is_admin(request) or has_permission(request.user, "properties.edit.any")
        if not can_edit_any and not repository.is_own_draft(property_id, request.user.id):
            raise PermissionDenied("Solo puedes editar tus propios borradores.")
        data = dict(s.validated_data)
        if "published" in request.data and data.get("published") and not has_permission(request.user, "properties.publish"):
            raise PermissionDenied("Tu rol no puede publicar bienes raíces.")
        if not has_permission(request.user, "properties.publish"):
            data["published"] = False
        updated = repository.update(property_id, data, updated_by=request.user.id)
        if updated is None:
            raise NotFound("Propiedad no encontrada.")
        return Response(PropertySerializer(updated).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer}, tags=TAG, summary="Eliminar propiedad (admin)")
    def delete(self, request, property_id: int):
        repository = resolve(PropertyRepository)
        can_trash_any = is_admin(request) or has_permission(request.user, "properties.trash.any")
        if not can_trash_any and not repository.is_own_draft(property_id, request.user.id):
            raise PermissionDenied("Solo puedes enviar tus propios borradores a papelera.")
        if not repository.delete(property_id, deleted_by=request.user.id):
            raise NotFound("Propiedad no encontrada.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class PropertyTrashView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = (
        "properties.trash.any",
        "properties.trash.own",
        "properties.restore",
        "properties.delete_permanently",
    )

    @extend_schema(
        parameters=[PropertyListQuerySerializer],
        responses=paginated(PropertySerializer),
        tags=TAG,
        summary="Listar publicaciones en papelera",
    )
    def get(self, request):
        q = PropertyListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        params = q.validated_data
        params.setdefault("page", 1)
        params.setdefault("page_size", 12)
        can_see_all = is_admin(request) or has_permission(request.user, "properties.trash.any")
        owner_id = None if can_see_all else int(request.user.id)
        page = resolve(PropertyRepository).list_trash(
            page=params["page"], page_size=params["page_size"], owner_id=owner_id
        )
        return paginated_response(page, params, PropertySerializer)


class PropertyRestoreView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("properties.restore",)

    @extend_schema(request=None, responses={204: None, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Restaurar publicación desde papelera")
    def post(self, request, property_id: int):
        if not resolve(PropertyRepository).restore(property_id, restored_by=request.user.id):
            raise NotFound("La publicación no existe en papelera.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class PropertyPermanentDeleteView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("properties.delete_permanently",)

    @extend_schema(responses={204: None, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Eliminar publicación permanentemente")
    def delete(self, request, property_id: int):
        if not resolve(PropertyRepository).delete_permanently(property_id, deleted_by=request.user.id):
            raise NotFound("La publicación no existe en papelera.")
        return Response(status=status.HTTP_204_NO_CONTENT)
