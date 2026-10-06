from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import SearchRepository
from .serializers import SearchQuerySerializer, SearchResponseSerializer

GROUPS = ("services", "projects", "properties", "news")


class SearchView(APIView):
    @extend_schema(
        parameters=[SearchQuerySerializer],
        responses={200: SearchResponseSerializer, 400: ErrorSerializer},
        tags=["Búsqueda"],
        summary="Buscador global",
        description="El frontend arma los enlaces: services → /servicios#id, projects → /proyecto?id=, properties → /propiedad?id=, news → /noticia?id=.",
        auth=[],
    )
    def get(self, request):
        q = SearchQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        term, limit = q.validated_data["q"], q.validated_data.get("limit", 5)
        groups = resolve(SearchRepository).search(term, limit_per_group=limit)
        body = {g: groups.get(g, []) for g in GROUPS}
        body.update(query=term, total=sum(len(body[g]) for g in GROUPS))
        return Response(SearchResponseSerializer(body).data)
