from rest_framework.permissions import SAFE_METHODS, BasePermission

from .enums import Role


def is_admin(request) -> bool:
    user = getattr(request, "user", None)
    return bool(user and getattr(user, "is_authenticated", False) and user.role == Role.ADMIN)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request)


class IsAdminOrReadOnly(BasePermission):
    """Lectura pública; escritura solo rol admin."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_admin(request)
