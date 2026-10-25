from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .enums import Role


def has_permission(user, permission: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    checker = getattr(user, "has_permission", None)
    if callable(checker):
        return bool(checker(permission))
    permissions = getattr(user, "permissions", ())
    return "admin.all" in permissions or permission in permissions


def has_any_permission(user, permissions) -> bool:
    return any(has_permission(user, permission) for permission in permissions)


def is_admin(request) -> bool:
    return has_permission(getattr(request, "user", None), "admin.all")


class IsAdmin(BasePermission):
    """Solo `admin.all`. Preferir ResourcePermission con un `permission_map` (BE-02)."""

    def has_permission(self, request, view):
        return is_admin(request)


class IsAdminOrReadOnly(BasePermission):
    """Lectura pública; escritura solo con `admin.all`. Permiso por defecto de DRF en settings;
    las vistas con escritura declaran ResourcePermission (BE-02)."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_admin(request)


class ResourcePermission(BasePermission):
    """
    Permiso único para todos los recursos, configurado por vista (BE-02):

        permission_classes = [ResourcePermission]
        permission_map = {"POST": ("projects.create",), "PATCH": ("projects.edit.any", "projects.edit.own")}
        read_public = True        # opcional; por defecto True

    - Un método con entrada en `permission_map` exige CUALQUIERA de sus claves.
      `admin.all` siempre pasa (lo resuelve `has_permission`).
    - Un método seguro (GET) sin entrada es público solo si `read_public` es True.
      HEAD y OPTIONS usan la entrada de GET.
    - Un método de escritura sin entrada se deniega: olvidar el mapa nunca abre escritura.

    La propiedad del registro (`.own`) y el estado (borrador) no se conocen aquí: la vista
    los comprueba con el repositorio después de pasar este permiso.
    """

    permission_map: dict = {}
    read_public: bool = True

    def has_permission(self, request, view):
        permission_map = getattr(view, "permission_map", None) or self.permission_map
        read_public = getattr(view, "read_public", self.read_public)
        method = request.method.upper()
        required = permission_map.get(method)
        if required is None and method in ("HEAD", "OPTIONS"):
            required = permission_map.get("GET")
        if required is None:
            return method in SAFE_METHODS and read_public
        return has_any_permission(getattr(request, "user", None), required)


def restrict_to_drafts(request, data: dict, publish_permission: str, message: str) -> dict:
    """
    Sin `publish_permission` solo se guardan borradores: pedir `published=true` es 403 y,
    si no lo pide, se fuerza `published=False`. Con el permiso, `data` queda intacto.
    """
    if has_permission(getattr(request, "user", None), publish_permission):
        return data
    if "published" in request.data and data.get("published"):
        raise PermissionDenied(message)
    data["published"] = False
    return data


class HasAnyPermission(BasePermission):
    """Requiere una de las claves declaradas en `view.required_permissions`."""

    def has_permission(self, request, view):
        return has_any_permission(
            getattr(request, "user", None),
            getattr(view, "required_permissions", ()),
        )
