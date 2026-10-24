"""Contratos de la fábrica de publicaciones (Abstract Factory)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True, eq=False)
class PublicationKit:
    """
    La "familia" de un tipo de publicación. Es la única fuente de:
    (1) los permisos del catálogo, (2) los tipos que aparecen en `/admin/trash/` y
    (3) la etiqueta de cada módulo en el historial.
    """

    key: str                   # "properties", "projects", "news"
    label: str                 # "bienes raíces", "proyectos", "noticias"
    repository: object         # implementa la interfaz de repositorio del tipo
    permissions: dict          # {nombre: descripción}, generado con publication_permissions()
    audit_module: str          # valor de historial_actividad.modulo
    supports_trash: bool       # False: el borrado es definitivo (noticias, DEC-04)
    ownership: bool            # distingue .any / .own

    @property
    def audit_label(self) -> str:
        return self.label[:1].upper() + self.label[1:]


class PublicationFactory(ABC):
    """Crea el kit de un tipo de publicación. Agregar un tipo = una subclase y un registro."""

    @abstractmethod
    def create_kit(self) -> PublicationKit: ...
