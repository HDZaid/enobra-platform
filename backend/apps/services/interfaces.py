from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class ServiceRepository(ABC):
    """Catálogo de servicios (Diseño, Administración de proyectos, Preconstrucción, Construcción). Solo lectura."""

    @abstractmethod
    def list(self) -> list[dict]: ...

    @abstractmethod
    def get(self, service_id: str) -> Optional[dict]: ...
