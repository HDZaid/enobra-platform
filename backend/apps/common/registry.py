"""Registro de implementaciones (inversión de dependencias)."""
from typing import TypeVar

T = TypeVar("T")
_registry: dict[type, object] = {}


class NotBoundError(Exception):
    """La interfaz aún no tiene una implementación registrada (BD sin acoplar)."""

    def __init__(self, interface: type):
        super().__init__(f"No hay implementación registrada para {interface.__name__}.")
        self.interface = interface


def register(interface: type[T], implementation: T) -> None:
    _registry[interface] = implementation


def resolve(interface: type[T]) -> T:
    try:
        return _registry[interface]  # type: ignore[return-value]
    except KeyError:
        raise NotBoundError(interface) from None
