from __future__ import annotations

from abc import ABC, abstractmethod


class CompanyRepository(ABC):
    """Datos de contacto y marca (registro único)."""

    @abstractmethod
    def get(self) -> dict: ...

    @abstractmethod
    def update(self, data: dict, *, updated_by: str) -> dict: ...


class InstitutionRepository(ABC):
    """Textos institucionales de 'Nosotros' (registro único)."""

    @abstractmethod
    def get(self) -> dict: ...

    @abstractmethod
    def update(self, data: dict, *, updated_by: str) -> dict: ...
