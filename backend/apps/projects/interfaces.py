from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from apps.common.pagination import Page


class ProjectRepository(ABC):
    """
    Portafolio. `id` es un slug de texto generado a partir del título (p. ej. "residencia-las-cumbres").
    Los métodos devuelven dicts (o cualquier objeto con los atributos del ProjectSerializer).
    """

    @abstractmethod
    def list(self, *, year: Optional[int], include_unpublished: bool, page: int, page_size: int) -> Page:
        """Orden: año descendente, luego más reciente primero."""

    @abstractmethod
    def years(self, *, include_unpublished: bool) -> list[int]:
        """Años distintos con proyectos, descendente (alimenta el filtro por año)."""

    @abstractmethod
    def get(self, project_id: str, *, include_unpublished: bool) -> Optional[dict]: ...

    @abstractmethod
    def create(self, data: dict, *, created_by: str) -> dict:
        """Genera el slug `id` único a partir de `title`."""

    @abstractmethod
    def update(self, project_id: str, data: dict, *, updated_by: str) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, project_id: str) -> bool: ...
