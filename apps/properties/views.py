from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.enums import Operation, PropertyType
from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import is_admin
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


class PropertyListCreateView(APIView):
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
        filters = PropertyFilters(
            operation=p.get("operation"),
            type=p.get("type"),
            zone=p.get("zone"),
            min_price=p.get("min_price"),
            max_price=p.get("max_price"),
            q=p.get("q", ""),
            ids=p.get("ids"),
            sort=p.get("sort", "recent"),
            include_unpublished=is_admin(request),
        )
        page = resolve(PropertyRepository).list(filters, page=p["page"], page_size=p["page_size"])
        return paginated_response(page, p, PropertySerializer)

    @extend_schema(request=PropertyWriteSerializer, responses={201: PropertySerializer, **ERR}, tags=TAG, summary="Crear propiedad (admin)")
    def post(self, request):
        s = PropertyWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        created = resolve(PropertyRepository).create(s.validated_data, created_by=request.user.id)
        return Response(PropertySerializer(created).data, status=status.HTTP_201_CREATED)


class PropertyFacetsView(APIView):
    @extend_schema(responses=PropertyFacetsSerializer, tags=TAG, summary="Opciones para poblar los filtros", auth=[])
    def get(self, request):
        facets = resolve(PropertyRepository).facets(include_unpublished=is_admin(request))
        facets = {"operations": [c for c, _ in Operation.choices], "types": [c for c, _ in PropertyType.choices], **facets}
        return Response(PropertyFacetsSerializer(facets).data)


class PropertyDetailView(APIView):
    @extend_schema(responses={200: PropertySerializer, 404: ErrorSerializer}, tags=TAG, summary="Ficha de propiedad", operation_id="properties_retrieve", auth=[])
    def get(self, request, property_id: int):
        item = resolve(PropertyRepository).get(property_id, include_unpublished=is_admin(request))
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
        updated = resolve(PropertyRepository).update(property_id, s.validated_data, updated_by=request.user.id)
        if updated is None:
            raise NotFound("Propiedad no encontrada.")
        return Response(PropertySerializer(updated).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer}, tags=TAG, summary="Eliminar propiedad (admin)")
    def delete(self, request, property_id: int):
        if not resolve(PropertyRepository).delete(property_id):
            raise NotFound("Propiedad no encontrada.")
        return Response(status=status.HTTP_204_NO_CONTENT)
