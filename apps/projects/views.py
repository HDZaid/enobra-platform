from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import is_admin
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import ProjectRepository
from .serializers import (
    ProjectListQuerySerializer,
    ProjectSerializer,
    ProjectWriteSerializer,
    ProjectYearsSerializer,
)

TAG = ["Proyectos"]
ERR = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer}


class ProjectListCreateView(APIView):
    @extend_schema(
        parameters=[ProjectListQuerySerializer],
        responses=paginated(ProjectSerializer),
        tags=TAG,
        summary="Listar proyectos (filtro por año)", operation_id="projects_list",
        description="Público: solo `published=true`. Con token admin se incluyen borradores.",
        auth=[],
    )
    def get(self, request):
        q = ProjectListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        p = q.validated_data
        p.setdefault("page", 1)
        p.setdefault("page_size", 12)
        page = resolve(ProjectRepository).list(
            year=p.get("year"), include_unpublished=is_admin(request), page=p["page"], page_size=p["page_size"]
        )
        return paginated_response(page, p, ProjectSerializer)

    @extend_schema(
        request=ProjectWriteSerializer, responses={201: ProjectSerializer, **ERR}, tags=TAG, summary="Crear proyecto (admin)"
    )
    def post(self, request):
        s = ProjectWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        created = resolve(ProjectRepository).create(s.validated_data, created_by=request.user.id)
        return Response(ProjectSerializer(created).data, status=status.HTTP_201_CREATED)


class ProjectYearsView(APIView):
    @extend_schema(responses=ProjectYearsSerializer, tags=TAG, summary="Años disponibles para el filtro", auth=[])
    def get(self, request):
        years = resolve(ProjectRepository).years(include_unpublished=is_admin(request))
        return Response({"years": years})


class ProjectDetailView(APIView):
    def _get_or_404(self, request, project_id):
        item = resolve(ProjectRepository).get(project_id, include_unpublished=is_admin(request))
        if item is None:
            raise NotFound("Proyecto no encontrado.")
        return item

    @extend_schema(responses={200: ProjectSerializer, 404: ErrorSerializer}, tags=TAG, summary="Detalle de proyecto", operation_id="projects_retrieve", auth=[])
    def get(self, request, project_id: str):
        return Response(ProjectSerializer(self._get_or_404(request, project_id)).data)

    @extend_schema(request=ProjectWriteSerializer, responses={200: ProjectSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Reemplazar proyecto (admin)")
    def put(self, request, project_id: str):
        return self._save(request, project_id, partial=False)

    @extend_schema(request=ProjectWriteSerializer(partial=True), responses={200: ProjectSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Editar proyecto parcialmente (admin)")
    def patch(self, request, project_id: str):
        return self._save(request, project_id, partial=True)

    def _save(self, request, project_id, *, partial):
        s = ProjectWriteSerializer(data=request.data, partial=partial)
        s.is_valid(raise_exception=True)
        updated = resolve(ProjectRepository).update(project_id, s.validated_data, updated_by=request.user.id)
        if updated is None:
            raise NotFound("Proyecto no encontrado.")
        return Response(ProjectSerializer(updated).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer}, tags=TAG, summary="Eliminar proyecto (admin)")
    def delete(self, request, project_id: str):
        if not resolve(ProjectRepository).delete(project_id):
            raise NotFound("Proyecto no encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)
