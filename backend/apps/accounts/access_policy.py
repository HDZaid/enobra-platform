"""
Permisos conocidos por la aplicación y asignación inicial de roles EnObra.

El catálogo se arma con los permisos de la plataforma más los que aporta cada fábrica de
publicaciones registrada (`apps.publications`): agregar un tipo de publicación agrega sus
permisos aquí sin editar este archivo. `PERMISSION_CATALOG` y `BUILTIN_ROLES` son vistas
de solo lectura que se recalculan en cada acceso, así que se comportan como diccionarios.
"""
from collections.abc import Mapping

from apps.common.rbac import PLATFORM_PERMISSIONS
from apps.publications.registry import publication_registry


def permission_catalog() -> dict[str, str]:
    """`{permiso: descripción}`: plataforma + publicaciones registradas."""
    catalog = dict(PLATFORM_PERMISSIONS)
    for name, description in publication_registry.permissions().items():
        if name in catalog:
            raise ValueError(f"El permiso {name!r} ya existe en la plataforma.")
        catalog[name] = description
    return catalog


def builtin_roles() -> dict[str, dict]:
    """Roles predeterminados. El Ingeniero recibe siempre todo el catálogo."""
    return {
        "Ingeniero": {
            "description": "Administrador principal de EnObra.",
            "permissions": tuple(permission_catalog()),
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


class _LiveMapping(Mapping):
    """Mapping de solo lectura que consulta su función en cada acceso."""

    def __init__(self, build):
        self._build = build

    def __getitem__(self, key):
        return self._build()[key]

    def __iter__(self):
        return iter(self._build())

    def __len__(self):
        return len(self._build())

    def __repr__(self):
        return repr(self._build())


PERMISSION_CATALOG = _LiveMapping(permission_catalog)
BUILTIN_ROLES = _LiveMapping(builtin_roles)
