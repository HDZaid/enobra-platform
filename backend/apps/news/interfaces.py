from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from apps.common.pagination import Page


class NewsRepository(ABC):
    """Noticias y eventos. `id` es un slug de texto generado a partir del título."""

    @abstractmethod
    def list(self, *, category: Optional[str], include_unpublished: bool, page: int, page_size: int) -> Page:
        """Orden: `date` descendente."""

    @abstractmethod
    def get(self, news_id: str, *, include_unpublished: bool) -> Optional[dict]: ...

    @abstractmethod
    def create(self, data: dict, *, created_by: str) -> dict: ...

    @abstractmethod
    def update(self, news_id: str, data: dict, *, updated_by: str) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, news_id: str) -> bool: ...
