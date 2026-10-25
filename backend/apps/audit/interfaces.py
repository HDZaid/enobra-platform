from abc import ABC, abstractmethod
from typing import Iterable

from apps.common.pagination import Page


class AuditRepository(ABC):
    @abstractmethod
    def list(self, filters: dict, page: int, page_size: int) -> Page: ...

    @abstractmethod
    def export_rows(self, filters: dict) -> Iterable[dict]: ...
