import csv

from django.http import StreamingHttpResponse
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import HasAnyPermission
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer
from .interfaces import AuditRepository
from .serializers import AuditFilterSerializer, AuditQuerySerializer, AuditSerializer

ERRORS = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer}
CSV_COLUMNS = ("id", "user_id", "user_name", "action", "module", "record_id",
               "record_name", "description", "date")


class Echo:
    def write(self, value):
        return value


def safe_cell(value):
    text = "" if value is None else str(value)
    # Also protect formulas preceded by whitespace/control characters.
    if text.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")) or text.startswith(("\t", "\r", "\n")):
        return "'" + text
    return text


def csv_rows(rows):
    writer = csv.writer(Echo())
    yield writer.writerow(CSV_COLUMNS)
    for row in rows:
        values = (row["id"], row["user"]["id"], row["user"]["name"], row["action"],
                  row["module"], row["record_id"], row["record_name"], row["description"],
                  row["date"].isoformat())
        yield writer.writerow([safe_cell(value) for value in values])


class AuditListView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("audit.read",)

    @extend_schema(parameters=[AuditQuerySerializer], responses={200: paginated(AuditSerializer), **ERRORS},
                   tags=["Historial"], summary="Consultar historial administrativo")
    def get(self, request):
        query = AuditQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        page = resolve(AuditRepository).list(params, params["page"], params["page_size"])
        return paginated_response(page, params, AuditSerializer)


class AuditExportView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("audit.export",)

    @extend_schema(parameters=[AuditFilterSerializer],
                   responses={(200, "text/csv"): OpenApiTypes.STR, **ERRORS},
                   tags=["Historial"], summary="Exportar hasta 10 000 eventos en CSV")
    def get(self, request):
        query = AuditFilterSerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        rows = resolve(AuditRepository).export_rows(query.validated_data)
        response = StreamingHttpResponse(csv_rows(rows), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="historial.csv"'
        return response
