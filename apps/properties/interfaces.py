from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from apps.common.enums import PropertySort
from apps.common.pagination import Page


@dataclass
class PropertyFilters:
    """Filtros combinables del catálogo (equivalen a los del mockup)."""

    operation: Optional[str] = None      # Venta | Alquiler
    type: Optional[str] = None           # Casa | Apartamento | Terreno | Local
    zone: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    q: str = ""                          # busca sin tildes ni mayúsculas en título, zona, ubicación y tipo
    ids: Optional[list[int]] = None      # para "Favoritos" (el front guarda los ids en localStorage)
    sort: str = PropertySort.RECENT
    include_unpublished: bool = False


class PropertyRepository(ABC):
    """`id` numérico autogenerado. Devuelven dicts (o atributos del PropertySerializer)."""

    @abstractmethod
    def list(self, filters: PropertyFilters, *, page: int, page_size: int) -> Page:
        """sort: recent (por `date` desc), price_asc, price_desc."""

    @abstractmethod
    def facets(self, *, include_unpublished: bool) -> dict:
        """-> {"zones": [...], "min_price": int|None, "max_price": int|None}"""

    @abstractmethod
    def get(self, property_id: int, *, include_unpublished: bool) -> Optional[dict]: ...

    @abstractmethod
    def create(self, data: dict, *, created_by: str) -> dict: ...

    @abstractmethod
    def update(self, property_id: int, data: dict, *, updated_by: str) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, property_id: int) -> bool: ...
