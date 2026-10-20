"""Crea o reconcilia los roles y permisos iniciales de EnObra."""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.access_policy import BUILTIN_ROLES, PERMISSION_CATALOG
from persistence.models import Permiso, Rol, RolPermiso


class Command(BaseCommand):
    help = "Crea los permisos y roles Ingeniero, Arquitecta y Empleado. No crea cuentas de usuario."

    @transaction.atomic
    def handle(self, *args, **options):
        permissions = {}
        for name, description in PERMISSION_CATALOG.items():
            permission, _ = Permiso.objects.update_or_create(
                nombre=name,
                defaults={"descripcion": description},
            )
            permissions[name] = permission

        for name, specification in BUILTIN_ROLES.items():
            role, _ = Rol.objects.update_or_create(
                nombre=name,
                defaults={"descripcion": specification["description"], "estado": True},
            )
            desired = [permissions[p] for p in specification["permissions"]]
            desired_ids = [permission.pk for permission in desired]
            RolPermiso.objects.filter(rol=role).exclude(permiso_id__in=desired_ids).delete()
            existing_ids = set(RolPermiso.objects.filter(rol=role).values_list("permiso_id", flat=True))
            for permission in desired:
                if permission.pk not in existing_ids:
                    RolPermiso.objects.create(rol=role, permiso=permission)

        self.stdout.write(self.style.SUCCESS(
            f"Cargados {len(PERMISSION_CATALOG)} permisos y {len(BUILTIN_ROLES)} roles; no se crearon usuarios."
        ))
