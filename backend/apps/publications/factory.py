"""
Fábricas concretas de publicaciones.

Para agregar un tipo nuevo (p. ej. "terrenos") basta una subclase de
`ConfiguredPublicationFactory` y un `publication_registry.register(...)` en
`config/bindings.py`; el catálogo de permisos, `/admin/trash/` y las etiquetas del
historial se derivan solos. No se copian módulos.
"""
from __future__ import annotations

from apps.common.rbac import publication_permissions

from .interfaces import PublicationFactory, PublicationKit


class ConfiguredPublicationFactory(PublicationFactory):
    """Fábrica declarativa: la subclase solo define atributos y recibe el repositorio."""

    key: str
    label: str
    audit_module: str | None = None   # por defecto, igual que `key`
    supports_trash: bool = True
    ownership: bool = True

    def __init__(self, repository: object):
        self.repository = repository

    def create_kit(self) -> PublicationKit:
        return PublicationKit(
            key=self.key,
            label=self.label,
            repository=self.repository,
            permissions=publication_permissions(
                self.key, self.label, ownership=self.ownership, trash=self.supports_trash
            ),
            audit_module=self.audit_module or self.key,
            supports_trash=self.supports_trash,
            ownership=self.ownership,
        )


class PropertyFactory(ConfiguredPublicationFactory):
    key = "properties"
    label = "bienes raíces"


class ProjectFactory(ConfiguredPublicationFactory):
    key = "projects"
    label = "proyectos"


class NewsFactory(ConfiguredPublicationFactory):
    """Sin papelera (DEC-04) ni distinción propio/ajeno: create, edit, publish y delete."""

    key = "news"
    label = "noticias"
    supports_trash = False
    ownership = False
