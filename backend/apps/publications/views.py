"""BE-04/BE-05: papelera unificada. Los tipos y sus permisos salen del registro de fábricas."""
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.pagination import PageQuerySerializer, paginated, paginated_response
from apps.common.permissions import has_any_permission
from apps.common.rbac import trash_access

from .registry import publication_registry


class TrashQuerySerializer(PageQuerySerializer):
    def get_fields(self):
        fields = super().get_fields()
        # Los tipos válidos salen del registro: un tipo nuevo aparece sin tocar este archivo.
        fields["type"] = serializers.ChoiceField(choices=publication_registry.trash_keys())
        return fields


class TrashItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    trashed_at = serializers.DateTimeField()
    trashed_by = serializers.CharField(allow_null=True)
    trashed_by_name = serializers.CharField(allow_null=True)
    was_published = serializers.BooleanField()
    owner_id = serializers.CharField(allow_null=True)

    def get_fields(self):
        # `type` primero, como en el contrato publicado.
        type_field = serializers.ChoiceField(choices=publication_registry.trash_keys())
        return {"type": type_field, **super().get_fields()}


class UnifiedTrashView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(parameters=[TrashQuerySerializer], responses=paginated(TrashItemSerializer),
                   tags=["Papelera"], summary="Listar papelera por tipo de publicación")
    def get(self, request):
        query = TrashQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        kit = publication_registry.get(params["type"])
        everything, own_only = trash_access(kit.key, ownership=kit.ownership)
        can_see_all = has_any_permission(request.user, everything)
        if not can_see_all and not has_any_permission(request.user, own_only):
            raise PermissionDenied("No tienes permiso para consultar esta papelera.")
        page = kit.repository.list_trash(
            page=params["page"], page_size=params["page_size"],
            owner_id=None if can_see_all else int(request.user.id))
        return paginated_response(page, params, TrashItemSerializer)
