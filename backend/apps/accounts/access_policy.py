"""Permisos conocidos por la aplicación y asignación inicial de roles EnObra."""

PERMISSION_CATALOG = {
    "admin.all": "Acceso completo a las operaciones administrativas.",
    "users.manage": "Crear y administrar cuentas de usuario.",
    "roles.manage": "Consultar, crear y configurar roles y permisos.",
    "audit.read": "Consultar el historial de actividad administrativa.",
    "properties.create": "Crear publicaciones de bienes raíces.",
    "properties.edit.any": "Editar cualquier publicación de bienes raíces.",
    "properties.edit.own": "Editar borradores propios de bienes raíces.",
    "properties.publish": "Publicar o retirar publicaciones de bienes raíces.",
    "properties.trash.any": "Enviar cualquier publicación de bienes raíces a papelera.",
    "properties.trash.own": "Enviar borradores propios a papelera.",
    "properties.restore": "Restaurar publicaciones de bienes raíces desde papelera.",
    "properties.delete_permanently": "Eliminar publicaciones de bienes raíces permanentemente.",
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
        ),
    },
    "Empleado": {
        "description": "Puede preparar borradores propios de bienes raíces.",
        "permissions": (
            "properties.create",
            "properties.edit.own",
            "properties.trash.own",
        ),
    },
}
