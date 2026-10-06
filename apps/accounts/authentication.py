from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from apps.common.registry import resolve

from .interfaces import AuthService


class BearerTokenAuthentication(BaseAuthentication):
    """Authorization: Bearer <access>. Sin header => anónimo (request.user = None)."""

    keyword = b"bearer"

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts:
            return None
        if parts[0].lower() != self.keyword or len(parts) != 2:
            raise AuthenticationFailed("Encabezado Authorization inválido. Usa: Bearer <token>.")
        principal = resolve(AuthService).verify_access_token(parts[1].decode())
        if principal is None:
            raise AuthenticationFailed("Token inválido o expirado.")
        return principal, parts[1].decode()

    def authenticate_header(self, request):
        return "Bearer"


# Documentación OpenAPI del esquema Bearer (solo afecta al generador de docs).
from drf_spectacular.extensions import OpenApiAuthenticationExtension  # noqa: E402


class BearerTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.BearerTokenAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
