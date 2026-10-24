"""Permisos conocidos por la aplicación y asignación inicial de roles EnObra."""
from apps.common.rbac import PLATFORM_PERMISSIONS, publication_permissions

PERMISSION_CATALOG = {
    **PLATFORM_PERMISSIONS,
    **publication_permissions("properties", "bienes raíces"),
    **publication_permissions("projects", "proyectos"),
}

BUILTIN_ROLES = {
    "Ingeniero": {
        "description": "Administrador principal de EnObra.",
        "permissions": tuple(PERMISSION_CATALOG),
    },
    "Arquitecta": {
        "description": "Subadministradora de publicaciones de bienes raíces.",
        "permissions": (
            "properties.create",
            "properties.edit.any",
            "properties.publish",
            "properties.trash.any",
            "properties.restore",
            "media.upload",
        ),
    },
    "Empleado": {
        "description": "Puede preparar borradores propios de bienes raíces.",
        "permissions": (
            "properties.create",
            "properties.edit.own",
            "properties.trash.own",
            "media.upload",
        ),
    },
}
