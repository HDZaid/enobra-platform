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
    def has_permission(self, request, view):
        return is_admin(request)


class IsAdminOrReadOnly(BasePermission):
    """Lectura pública; escritura administrativa completa."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_admin(request)


class HasAnyPermission(BasePermission):
    """Requiere una de las claves declaradas en `view.required_permissions`."""

    def has_permission(self, request, view):
        return has_any_permission(
            getattr(request, "user", None),
            getattr(view, "required_permissions", ()),
        )
