"""Registro de fábricas de publicaciones: fuente única de catálogo, papelera e historial."""
from __future__ import annotations

import re

from .interfaces import PublicationFactory, PublicationKit

KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
TRASH_METHODS = ("list_trash", "restore", "delete_permanently")


class PublicationRegistry:
    def __init__(self) -> None:
        self._kits: dict[str, PublicationKit] = {}

    # --- registro ---------------------------------------------------------------------

    def register(self, factory: PublicationFactory, *, replace: bool = False) -> PublicationKit:
        """Valida y guarda el kit de la fábrica. `replace=True` hace el registro idempotente."""
        kit = factory.create_kit()
        self._validate(kit, replace=replace)
        self._kits[kit.key] = kit
        return kit

    def unregister(self, key: str) -> None:
        self._kits.pop(key, None)

    def _validate(self, kit: PublicationKit, *, replace: bool) -> None:
        if not KEY_PATTERN.match(kit.key):
            raise ValueError(f"Clave de publicación inválida: {kit.key!r}.")
        if kit.key in self._kits and not replace:
            raise ValueError(f"Ya hay una fábrica registrada para {kit.key!r}.")
        foreign = [name for name in kit.permissions if not name.startswith(kit.key + ".")]
        if foreign:
            raise ValueError(f"Los permisos de {kit.key!r} deben empezar por '{kit.key}.': {foreign}.")
        others = {k: v for k, v in self._kits.items() if k != kit.key}
        taken = {name for other in others.values() for name in other.permissions}
        if taken & set(kit.permissions):
            raise ValueError(f"Permisos repetidos entre publicaciones: {sorted(taken & set(kit.permissions))}.")
        if any(other.audit_module == kit.audit_module for other in others.values()):
            raise ValueError(f"El módulo de historial {kit.audit_module!r} ya pertenece a otra publicación.")
        if kit.supports_trash:
            missing = [m for m in TRASH_METHODS if not callable(getattr(kit.repository, m, None))]
            if missing:
                raise TypeError(f"El repositorio de {kit.key!r} no implementa la papelera: {missing}.")

    # --- consulta ---------------------------------------------------------------------

    def get(self, key: str) -> PublicationKit:
        return self._kits[key]

    def keys(self) -> list[str]:
        return list(self._kits)

    def kits(self) -> list[PublicationKit]:
        return list(self._kits.values())

    def trash_kits(self) -> list[PublicationKit]:
        return [kit for kit in self._kits.values() if kit.supports_trash]

    def trash_keys(self) -> list[str]:
        return [kit.key for kit in self.trash_kits()]

    def permissions(self) -> dict[str, str]:
        """Permisos de todas las publicaciones registradas, en orden de registro."""
        return {name: description for kit in self._kits.values() for name, description in kit.permissions.items()}

    def audit_labels(self) -> dict[str, str]:
        """`{historial_actividad.modulo: etiqueta legible}` de cada publicación."""
        return {kit.audit_module: kit.audit_label for kit in self._kits.values()}

    def audit_label(self, module: str) -> str | None:
        return self.audit_labels().get(module)


publication_registry = PublicationRegistry()
