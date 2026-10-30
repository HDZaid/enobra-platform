"""Repositorio ORM para la administración de permisos y roles."""
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.accounts.access_policy import fixed_role_name, fixed_permissions, FIXED_ROLE_DESCRIPTIONS
from apps.accounts.interfaces import AccessControlRepository
from .models.access import Permiso, Rol, RolPermiso
from .models.audit import HistorialActividad


class DjangoAccessControlRepository(AccessControlRepository):
    def list_permissions(self):
        return [
            {"name": row.nombre, "description": row.descripcion}
            for row in Permiso.objects.order_by("nombre")
        ]

    def _serialize_role(self, role):
        return {
            "id": role.pk,
            "name": fixed_role_name(role.nombre) or role.nombre,
            "description": FIXED_ROLE_DESCRIPTIONS.get(fixed_role_name(role.nombre), role.descripcion or ""),
            "active": role.estado,
            "permissions": sorted(fixed_permissions(role.nombre)),
        }

    def list_roles(self):
        return [
            self._serialize_role(role)
            for role in Rol.objects.order_by("nombre").prefetch_related("permisos")
        ]

    def get_role(self, role_id):
        role = Rol.objects.filter(pk=role_id).prefetch_related("permisos").first()
        return self._serialize_role(role) if role else None

    @staticmethod
    def _permissions(names):
        permissions = list(Permiso.objects.filter(nombre__in=names).order_by("nombre"))
        found = {permission.nombre for permission in permissions}
        missing = sorted(set(names) - found)
        if missing:
            raise ValidationError({"permissions": [f"Permiso desconocido: {name}." for name in missing]})
        return permissions

    @staticmethod
    def _audit(role, action, actor_id):
        HistorialActividad.objects.create(
            usuario_id=actor_id,
            accion=action,
            modulo="roles",
            id_registro=role.pk,
            nombre_registro=role.nombre[:250],
            descripcion="Permisos: " + ", ".join(
                role.permisos.order_by("nombre").values_list("nombre", flat=True)
            )[:450],
        )

    def create_role(self, data, *, actor_id):
        raise PermissionDenied('Los roles predeterminados no se pueden crear.')

    def update_role(self, role_id, data, *, actor_id):
        raise PermissionDenied('Los roles predeterminados no se pueden modificar.')
