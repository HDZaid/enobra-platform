from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional

from apps.common.pagination import Page

EXPORT_MAX_ROWS = 10_000


@dataclass(frozen=True)
class AuditFilters:
    """Filtros combinables del historial (`historial_actividad`)."""

    user_id: Optional[int] = None
    module: Optional[str] = None
    action: Optional[str] = None
    date_from: Optional[date] = None   # inclusivo, en America/Guatemala
    date_to: Optional[date] = None     # inclusivo, en America/Guatemala
    q: str = ""                        # busca en nombre del registro y descripción


class AuditRepository(ABC):
    """
    Lectura del historial de actividad. Cada fila es un dict con:
    id, user {id, name}, action, module, record_id, record_name, description, date.
    Nunca devuelve el correo ni otros datos sensibles del usuario.
    """

    @abstractmethod
    def list(self, filters: AuditFilters, *, page: int, page_size: int) -> Page:
        """Orden: más reciente primero (`-fecha`)."""

    @abstractmethod
    def export_rows(self, filters: AuditFilters, *, limit: int = EXPORT_MAX_ROWS) -> Iterable[dict]:
        """Mismas filas y orden que `list`, hasta `limit`, para exportar a CSV."""
