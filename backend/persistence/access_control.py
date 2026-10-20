"""Repositorio ORM para la administración de permisos y roles."""
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

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
            "name": role.nombre,
            "description": role.descripcion or "",
            "active": role.estado,
            "permissions": list(role.permisos.order_by("nombre").values_list("nombre", flat=True)),
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

    @transaction.atomic
    def create_role(self, data, *, actor_id):
        name = data["name"].strip()
        if name.casefold() in {"admin", "administrador"}:
            raise ValidationError({"name": "Este nombre está reservado para compatibilidad con roles existentes."})
        permissions = self._permissions(data["permissions"])
        try:
            role = Rol.objects.create(
                nombre=name,
                descripcion=data.get("description", "").strip() or None,
                estado=data.get("active", True),
            )
        except IntegrityError:
            raise ValidationError({"name": "Ya existe un rol con este nombre."}) from None
        for permission in permissions:
            RolPermiso.objects.create(rol=role, permiso=permission)
        self._audit(role, "CREAR", actor_id)
        return self._serialize_role(role)

    @transaction.atomic
    def update_role(self, role_id, data, *, actor_id):
        role = Rol.objects.select_for_update().filter(pk=role_id).first()
        if role is None:
            return None
        permission_objects = None
        if "permissions" in data:
            permission_objects = self._permissions(data["permissions"])
            if role.nombre == "Ingeniero" and not any(p.nombre == "admin.all" for p in permission_objects):
                raise ValidationError({"permissions": "El rol Ingeniero debe conservar admin.all."})
        if role.nombre == "Ingeniero" and data.get("active") is False:
            raise ValidationError({"active": "El rol Ingeniero no puede desactivarse."})
        if "name" in data:
            new_name = data["name"].strip()
            if new_name.casefold() in {"admin", "administrador"} and new_name != role.nombre:
                raise ValidationError({"name": "Este nombre está reservado para compatibilidad con roles existentes."})
            if role.nombre == "Ingeniero" and new_name != role.nombre:
                raise ValidationError({"name": "El rol Ingeniero no puede renombrarse."})
            role.nombre = new_name
        if "description" in data:
            role.descripcion = data["description"].strip() or None
        if "active" in data:
            role.estado = data["active"]
        try:
            role.save()
        except IntegrityError:
            raise ValidationError({"name": "Ya existe un rol con este nombre."}) from None
        if permission_objects is not None:
            wanted_ids = [permission.pk for permission in permission_objects]
            links = RolPermiso.objects.filter(rol=role)
            if wanted_ids:
                links.exclude(permiso_id__in=wanted_ids).delete()
            else:
                links.delete()
            existing_ids = set(RolPermiso.objects.filter(rol=role).values_list("permiso_id", flat=True))
            for permission in permission_objects:
                if permission.pk not in existing_ids:
                    RolPermiso.objects.create(rol=role, permiso=permission)
        self._audit(role, "EDITAR", actor_id)
        return self._serialize_role(role)
