from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import (
    HasAnyPermission, ResourcePermission, has_any_permission, has_permission, is_admin, restrict_to_drafts,
)
from apps.common.pagination import PageQuerySerializer
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

PROJECT_PERMISSIONS = {
    "POST": ("projects.create",),
    "PUT": ("projects.edit.any", "projects.edit.own"),
    "PATCH": ("projects.edit.any", "projects.edit.own"),
    "DELETE": ("projects.trash.any", "projects.trash.own"),
}


def can_edit_any(request) -> bool:
    """Quien edita cualquier proyecto también ve todos los borradores."""
    return is_admin(request) or has_permission(request.user, "projects.edit.any")


class ProjectListCreateView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = PROJECT_PERMISSIONS

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
            year=p.get("year"), include_unpublished=can_edit_any(request), page=p["page"], page_size=p["page_size"]
        )
        return paginated_response(page, p, ProjectSerializer)

    @extend_schema(
        request=ProjectWriteSerializer, responses={201: ProjectSerializer, **ERR}, tags=TAG, summary="Crear proyecto (admin)"
    )
    def post(self, request):
        s = ProjectWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = restrict_to_drafts(request, dict(s.validated_data), "projects.publish",
                                  "Tu rol solo puede crear borradores.")
        created = resolve(ProjectRepository).create(data, created_by=request.user.id)
        return Response(ProjectSerializer(created).data, status=status.HTTP_201_CREATED)


class ProjectYearsView(APIView):
    @extend_schema(responses=ProjectYearsSerializer, tags=TAG, summary="Años disponibles para el filtro", auth=[])
    def get(self, request):
        years = resolve(ProjectRepository).years(include_unpublished=can_edit_any(request))
        return Response({"years": years})


class ProjectDetailView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = PROJECT_PERMISSIONS

    def _get_or_404(self, request, project_id):
        repository = resolve(ProjectRepository)
        include_unpublished = can_edit_any(request)
        if not include_unpublished and has_permission(request.user, "projects.edit.own"):
            include_unpublished = repository.is_own_draft(project_id, request.user.id)
        item = repository.get(project_id, include_unpublished=include_unpublished)
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
        repository = resolve(ProjectRepository)
        if not can_edit_any(request) and not repository.is_own_draft(project_id, request.user.id):
            raise PermissionDenied("Solo puedes editar tus propios borradores.")
        data = restrict_to_drafts(request, dict(s.validated_data), "projects.publish",
                                  "Tu rol no puede publicar proyectos.")
        updated = repository.update(project_id, data, updated_by=request.user.id)
        if updated is None:
            raise NotFound("Proyecto no encontrado.")
        return Response(ProjectSerializer(updated).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer}, tags=TAG, summary="Enviar proyecto a papelera (admin)")
    def delete(self, request, project_id: str):
        repository = resolve(ProjectRepository)
        can_trash_any = is_admin(request) or has_permission(request.user, "projects.trash.any")
        if not can_trash_any and not repository.is_own_draft(project_id, request.user.id):
            raise PermissionDenied("Solo puedes enviar tus propios borradores a papelera.")
        if not repository.delete(project_id, deleted_by=request.user.id):
            raise NotFound("Proyecto no encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectTrashView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = (
        "projects.trash.any", "projects.trash.own",
        "projects.restore", "projects.delete_permanently",
    )

    @extend_schema(parameters=[PageQuerySerializer], responses=paginated(ProjectSerializer),
                   tags=TAG, summary="Listar proyectos en papelera")
    def get(self, request):
        query = PageQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        can_see_all = has_any_permission(request.user, (
            "projects.trash.any", "projects.restore", "projects.delete_permanently"))
        page = resolve(ProjectRepository).list_trash(
            page=params["page"], page_size=params["page_size"],
            owner_id=None if can_see_all else int(request.user.id))
        return paginated_response(page, params, ProjectSerializer)


class ProjectRestoreView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("projects.restore",)

    @extend_schema(request=None, responses={204: None, 404: ErrorSerializer, **ERR},
                   tags=TAG, summary="Restaurar proyecto desde papelera")
    def post(self, request, project_id: str):
        if not resolve(ProjectRepository).restore(project_id, restored_by=request.user.id):
            raise NotFound("El proyecto no existe en papelera.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectPermanentDeleteView(APIView):
    permission_classes = [HasAnyPermission]
    required_permissions = ("projects.delete_permanently",)

    @extend_schema(responses={204: None, 404: ErrorSerializer, **ERR},
                   tags=TAG, summary="Eliminar proyecto permanentemente desde papelera")
    def delete(self, request, project_id: str):
        if not resolve(ProjectRepository).delete_permanently(project_id, deleted_by=request.user.id):
            raise NotFound("El proyecto no existe en papelera.")
        return Response(status=status.HTTP_204_NO_CONTENT)
