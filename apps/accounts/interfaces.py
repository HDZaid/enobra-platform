from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from apps.common.enums import Role


@dataclass(frozen=True)
class Principal:
    """Usuario autenticado que la capa de datos devuelve al verificar un token."""

    id: str
    name: str
    email: str
    role: str = Role.ADMIN

    is_authenticated = True


class AuthService(ABC):
    """
    Contrato de autenticación. Implementación esperada: JWT (access corto + refresh)
    con las dos cuentas reales de administración (Ing. Bernardo y la Arquitecta).
    Las contraseñas SIEMPRE con hash (Argon2/PBKDF2); nunca en texto plano.
    """

    @abstractmethod
    def login(self, email: str, password: str) -> Optional[dict]:
        """-> {"access","refresh","expires_in","user": Principal} o None si credenciales inválidas."""

    @abstractmethod
    def refresh(self, refresh_token: str) -> Optional[dict]:
        """-> {"access","expires_in"} o None si el refresh es inválido/expirado/revocado."""

    @abstractmethod
    def logout(self, refresh_token: str) -> None:
        """Revoca el refresh token (idempotente)."""

    @abstractmethod
    def verify_access_token(self, token: str) -> Optional[Principal]:
        """-> Principal o None si el token es inválido o expiró."""
