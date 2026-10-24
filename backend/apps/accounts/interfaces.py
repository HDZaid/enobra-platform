from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from apps.common.enums import Role
from apps.common.pagination import Page


@dataclass(frozen=True)
class Principal:
    """Usuario autenticado que la capa de datos devuelve al verificar un token."""

    id: str
    name: str
    email: str
    role: str = Role.ADMIN
    roles: tuple[str, ...] = ()
    permissions: frozenset[str] = field(default_factory=frozenset)

    is_authenticated = True

    def has_permission(self, permission: str) -> bool:
        # Compatibilidad temporal con los principals administrativos previos al RBAC.
        return (
            self.role == Role.ADMIN
            or "admin.all" in self.permissions
            or permission in self.permissions
        )


class AuthService(ABC):
    """
    Contrato de autenticación. JWT con permisos efectivos derivados de roles activos.
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


class AccessControlRepository(ABC):
    """Persistencia de roles y permisos sobre las tablas existentes."""

    @abstractmethod
    def list_permissions(self) -> list[dict]: ...

    @abstractmethod
    def list_roles(self) -> list[dict]: ...

    @abstractmethod
    def get_role(self, role_id: int) -> Optional[dict]: ...

    @abstractmethod
    def create_role(self, data: dict, *, actor_id: str) -> dict: ...

    @abstractmethod
    def update_role(self, role_id: int, data: dict, *, actor_id: str) -> Optional[dict]: ...


class UserRepository(ABC):
    @abstractmethod
    def list(self, *, q: str, page: int, page_size: int) -> Page: ...

    @abstractmethod
    def role_options(self) -> list[dict]: ...

    @abstractmethod
    def create(self, data: dict, *, actor_id: str) -> dict: ...

    @abstractmethod
    def update(self, user_id: int, data: dict, *, actor_id: str) -> Optional[dict]: ...

    @abstractmethod
    def replace_role(self, user_id: int, role_id: int, *, actor: Principal) -> Optional[dict]: ...
