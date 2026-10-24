from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import HasAnyPermission
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import AuditFilters, AuditRepository
from .serializers import AuditEntrySerializer, AuditListQuerySerializer, AuditQuerySerializer

TAG = ["Historial (admin)"]
ERR = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer,
       501: OpenApiResponse(ErrorSerializer, description="Pendiente de implementar (BE-07).")}


def _filters(data: dict) -> AuditFilters:
    return AuditFilters(
        user_id=data.get("user_id"),
        module=data.get("module"),
        action=data.get("action"),
        date_from=data.get("date_from"),
        date_to=data.get("date_to"),
        q=data.get("q", ""),
    )


class AuditListView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("audit.read",)

    @extend_schema(
        parameters=[AuditListQuerySerializer],
        responses={200: paginated(AuditEntrySerializer), **ERR},
        tags=TAG,
        summary="Consultar el historial de actividad",
        description="Requiere `audit.read`. Más reciente primero; máximo 100 por página.",
    )
    def get(self, request):
        query = AuditListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        params.setdefault("page", 1)
        params.setdefault("page_size", 12)
        page = resolve(AuditRepository).list(_filters(params), page=params["page"], page_size=params["page_size"])
        return paginated_response(page, params, AuditEntrySerializer)


class AuditExportView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("audit.export",)

    @extend_schema(
        parameters=[AuditQuerySerializer],
        responses={(200, "text/csv"): OpenApiTypes.STR, **ERR},
        tags=TAG,
        summary="Exportar el historial filtrado a CSV",
        description="Requiere `audit.export`. Mismos filtros que el listado; máximo 10 000 filas.",
    )
    def get(self, request):
        query = AuditQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        # BE-07 reemplaza esta línea por la respuesta CSV en streaming.
        resolve(AuditRepository).export_rows(_filters(query.validated_data))
