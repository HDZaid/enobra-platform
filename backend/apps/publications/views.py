"""BE-04: Henry registra estas URLs en config/urls.py mediante BE-00."""
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.pagination import PageQuerySerializer, paginated, paginated_response
from apps.common.permissions import has_any_permission
from apps.common.registry import resolve
from apps.projects.interfaces import ProjectRepository
from apps.properties.interfaces import PropertyRepository


class TrashQuerySerializer(PageQuerySerializer):
    type = serializers.ChoiceField(choices=("properties", "projects"))


class TrashItemSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=("properties", "projects"))
    id = serializers.CharField()
    title = serializers.CharField()
    trashed_at = serializers.DateTimeField()
    trashed_by = serializers.CharField(allow_null=True)
    trashed_by_name = serializers.CharField(allow_null=True)
    was_published = serializers.BooleanField()
    owner_id = serializers.CharField(allow_null=True)


class UnifiedTrashView(APIView):
    permission_classes = [IsAuthenticated]
    repositories = {"properties": PropertyRepository, "projects": ProjectRepository}

    @extend_schema(parameters=[TrashQuerySerializer], responses=paginated(TrashItemSerializer),
                   tags=["Papelera"], summary="Listar papelera por tipo de publicación")
    def get(self, request):
        query = TrashQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        kind = params["type"]
        broad_permissions = tuple(kind + "." + suffix for suffix in (
            "trash.any", "restore", "delete_permanently"))
        can_see_all = has_any_permission(request.user, broad_permissions)
        if not can_see_all and not has_any_permission(request.user, (kind + ".trash.own",)):
            raise PermissionDenied("No tienes permiso para consultar esta papelera.")
        page = resolve(self.repositories[kind]).list_trash(
            page=params["page"], page_size=params["page_size"],
            owner_id=None if can_see_all else int(request.user.id))
        return paginated_response(page, params, TrashItemSerializer)
