from __future__ import annotations

from abc import ABC, abstractmethod


class SearchRepository(ABC):
    """Buscador global (modal 'Explora EnObra'). Solo contenido publicado."""

    @abstractmethod
    def search(self, q: str, *, limit_per_group: int) -> dict[str, list[dict]]:
        """
        Búsqueda sin tildes ni mayúsculas sobre título/tipo/zona/resumen.
        -> {"services": [...], "projects": [...], "properties": [...], "news": [...]}
        con items {"id", "title", "subtitle"}.
        """
