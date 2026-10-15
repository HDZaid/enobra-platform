from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from apps.common.pagination import Page


class InquiryRepository(ABC):
    """
    Solicitudes recibidas desde los formularios públicos (contacto y visita a propiedad).
    Reemplaza la simulación de main.js ("CONECTAR API REAL AQUÍ").
    Se recomienda notificar a la empresa (correo/WhatsApp) al crear una solicitud.
    """

    @abstractmethod
    def create_contact(self, data: dict) -> dict:
        """-> {"id", "status": "nuevo", "created_at"}"""

    @abstractmethod
    def create_visit(self, data: dict) -> Optional[dict]:
        """Devuelve None si `property_id` no existe o no está publicada."""

    @abstractmethod
    def list(self, *, kind: Optional[str], status: Optional[str], page: int, page_size: int) -> Page:
        """Más recientes primero."""

    @abstractmethod
    def get(self, inquiry_id: str) -> Optional[dict]: ...

    @abstractmethod
    def update_status(self, inquiry_id: str, status: str, *, updated_by: str) -> Optional[dict]: ...
