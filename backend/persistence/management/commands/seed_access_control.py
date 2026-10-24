"""
Carga los permisos y roles iniciales de EnObra sin pisar lo configurado desde el panel.

Por defecto es NO destructivo (DEC-02): crea lo que falta y no modifica roles que ya
existen. Los modos `--add-missing` y `--sync` son opcionales y explícitos. Nunca crea
usuarios ni toca roles personalizados.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.access_policy import BUILTIN_ROLES, PERMISSION_CATALOG
from persistence.models import Permiso, Rol, RolPermiso

# Rol protegido: siempre conserva todo el catálogo y permanece activo en cualquier modo.
PROTECTED_ROLE = "Ingeniero"


class Command(BaseCommand):
    help = (
        "Crea los permisos y roles Ingeniero, Arquitecta y Empleado que falten, sin modificar los "
        "roles existentes (el Ingeniero siempre conserva los 32 permisos). No crea cuentas de usuario."
    )

    def add_arguments(self, parser):
        modes = parser.add_mutually_exclusive_group()
        modes.add_argument(
            "--add-missing", action="store_true",
            help="Agrega a los roles predeterminados los permisos que les falten, sin quitar ninguno.",
        )
        modes.add_argument(
            "--sync", action="store_true",
            help="Reconciliación total: deja los roles predeterminados exactamente como el catálogo "
                 "(quita permisos añadidos a mano y restaura descripción y estado).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        mode = "sync" if options["sync"] else "add-missing" if options["add_missing"] else "default"
        counts = {"permisos creados": 0, "descripciones actualizadas": 0, "roles creados": 0,
                  "permisos agregados a roles": 0, "permisos quitados de roles": 0}

        permissions = {}
        for name, description in PERMISSION_CATALOG.items():
            permission, created = Permiso.objects.get_or_create(nombre=name, defaults={"descripcion": description})
            if created:
                counts["permisos creados"] += 1
            elif permission.descripcion != description:
                # La descripción es metadato del catálogo: no es editable desde el panel.
                permission.descripcion = description
                permission.save(update_fields=["descripcion"])
                counts["descripciones actualizadas"] += 1
            permissions[name] = permission

        for name, specification in BUILTIN_ROLES.items():
            role = Rol.objects.filter(nombre=name).first()
            created = role is None
            if created:
                role = Rol.objects.create(nombre=name, descripcion=specification["description"], estado=True)
                counts["roles creados"] += 1
            elif mode == "sync":
                role.descripcion, role.estado = specification["description"], True
                role.save(update_fields=["descripcion", "estado"])
            elif name == PROTECTED_ROLE and not role.estado:
                role.estado = True
                role.save(update_fields=["estado"])

            desired = {permissions[p].pk for p in specification["permissions"]}
            existing = set(RolPermiso.objects.filter(rol=role).values_list("permiso_id", flat=True))
            if created or name == PROTECTED_ROLE or mode != "default":
                for permission_id in sorted(desired - existing):
                    RolPermiso.objects.create(rol=role, permiso_id=permission_id)
                    counts["permisos agregados a roles"] += 1
            if mode == "sync":
                extra = existing - desired
                if extra:
                    RolPermiso.objects.filter(rol=role, permiso_id__in=extra).delete()
                    counts["permisos quitados de roles"] += len(extra)

        summary = ", ".join(f"{value} {label}" for label, value in counts.items())
        self.stdout.write(self.style.SUCCESS(
            f"Modo {mode}: {summary}. Catálogo: {len(PERMISSION_CATALOG)} permisos y "
            f"{len(BUILTIN_ROLES)} roles; no se crearon usuarios."
        ))
