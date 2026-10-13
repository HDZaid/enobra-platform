from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import is_admin
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import NewsRepository
from .serializers import NewsListQuerySerializer, NewsSerializer, NewsWriteSerializer

TAG = ["Noticias"]
ERR = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer}


class NewsListCreateView(APIView):
    @extend_schema(parameters=[NewsListQuerySerializer], responses=paginated(NewsSerializer), tags=TAG, summary="Listar noticias y eventos", operation_id="news_list", auth=[])
    def get(self, request):
        q = NewsListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        p = q.validated_data
        p.setdefault("page", 1)
        p.setdefault("page_size", 12)
        page = resolve(NewsRepository).list(
            category=p.get("category"), include_unpublished=is_admin(request), page=p["page"], page_size=p["page_size"]
        )
        return paginated_response(page, p, NewsSerializer)

    @extend_schema(request=NewsWriteSerializer, responses={201: NewsSerializer, **ERR}, tags=TAG, summary="Crear noticia (admin)")
    def post(self, request):
        s = NewsWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        created = resolve(NewsRepository).create(s.validated_data, created_by=request.user.id)
        return Response(NewsSerializer(created).data, status=status.HTTP_201_CREATED)


class NewsDetailView(APIView):
    @extend_schema(responses={200: NewsSerializer, 404: ErrorSerializer}, tags=TAG, summary="Publicación completa", operation_id="news_retrieve", auth=[])
    def get(self, request, news_id: str):
        item = resolve(NewsRepository).get(news_id, include_unpublished=is_admin(request))
        if item is None:
            raise NotFound("Publicación no encontrada.")
        return Response(NewsSerializer(item).data)

    @extend_schema(request=NewsWriteSerializer, responses={200: NewsSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Reemplazar noticia (admin)")
    def put(self, request, news_id: str):
        return self._save(request, news_id, partial=False)

    @extend_schema(request=NewsWriteSerializer(partial=True), responses={200: NewsSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Editar noticia parcialmente (admin)")
    def patch(self, request, news_id: str):
        return self._save(request, news_id, partial=True)

    def _save(self, request, news_id, *, partial):
        s = NewsWriteSerializer(data=request.data, partial=partial)
        s.is_valid(raise_exception=True)
        updated = resolve(NewsRepository).update(news_id, s.validated_data, updated_by=request.user.id)
        if updated is None:
            raise NotFound("Publicación no encontrada.")
        return Response(NewsSerializer(updated).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer}, tags=TAG, summary="Eliminar noticia (admin)")
    def delete(self, request, news_id: str):
        if not resolve(NewsRepository).delete(news_id, deleted_by=request.user.id):
            raise NotFound("Publicación no encontrada.")
        return Response(status=status.HTTP_204_NO_CONTENT)
