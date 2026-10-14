"""JWT y sesiones revocables, respaldadas por usuario/rol y contenido_pagina."""
import hashlib
import secrets
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from apps.accounts.interfaces import AuthService, Principal
from apps.common.enums import Role
from .models.access import Permiso, Usuario
from .models.content import ContenidoPagina
from .support import read_data, write_data, normalized


class DjangoAuthService(AuthService):
    access_seconds = 900
    refresh_seconds = 7 * 24 * 3600
    issuer = "enobra"

    def _principal(self, user_id):
        user = Usuario.objects.filter(pk=user_id, estado="ACTIVO").first()
        if user is None:
            return None
        active_roles = user.roles.filter(estado=True).order_by("pk")
        role_names = tuple(active_roles.values_list("nombre", flat=True))
        if not role_names:
            return None
        permissions = set(
            Permiso.objects.filter(roles__in=active_roles)
            .values_list("nombre", flat=True)
            .distinct()
        )
        # Conserva las cuentas del esquema anterior mientras se migren a los permisos nuevos.
        legacy_admin = any(normalized(name) in ("admin", "administrador") for name in role_names)
        if legacy_admin:
            permissions.add("admin.all")
        primary_role = Role.ADMIN if legacy_admin else role_names[0]
        return Principal(
            id=str(user.pk),
            name=user.nombre,
            email=user.correo,
            role=primary_role,
            roles=role_names,
            permissions=frozenset(permissions),
        )

    def _token(self, user_id, session_id, kind, seconds):
        now = timezone.now()
        return jwt.encode({"sub": str(user_id), "sid": session_id, "type": kind,
            "iss": self.issuer, "aud": "enobra-api", "iat": now, "exp": now + timedelta(seconds=seconds)},
            settings.SECRET_KEY, algorithm="HS256")

    def _decode(self, token, kind):
        try:
            data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"],
                issuer=self.issuer, audience="enobra-api",
                options={"require": ["sub", "sid", "type", "iat", "exp"]})
            if data["type"] != kind or not isinstance(data["sid"], str) or len(data["sid"]) != 64:
                return None
            session = read_data("auth.session." + data["sid"])
            if not session or session["user_id"] != data["sub"]:
                return None
            if kind == "refresh" and not secrets.compare_digest(session["digest"], hashlib.sha256(token.encode()).hexdigest()):
                return None
            return data
        except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
            return None

    @transaction.atomic
    def login(self, email, password):
        user = Usuario.objects.filter(correo__iexact=email).first()
        if user is None:
            make_password(password)  # coste comparable a una verificación fallida
            return None
        if not check_password(password, user.password_hash):
            return None
        principal = self._principal(user.pk)
        if principal is None:
            return None
        sid = secrets.token_hex(32)
        refresh = self._token(user.pk, sid, "refresh", self.refresh_seconds)
        write_data("auth.session." + sid, {"user_id": str(user.pk),
            "digest": hashlib.sha256(refresh.encode()).hexdigest(),
            "expires_at": (timezone.now() + timedelta(seconds=self.refresh_seconds)).isoformat()})
        return {"access": self._token(user.pk, sid, "access", self.access_seconds),
                "refresh": refresh, "expires_in": self.access_seconds, "user": principal}

    def refresh(self, refresh_token):
        data = self._decode(refresh_token, "refresh")
        if not data or not self._principal(data["sub"]):
            return None
        return {"access": self._token(data["sub"], data["sid"], "access", self.access_seconds),
                "expires_in": self.access_seconds}

    def logout(self, refresh_token):
        data = self._decode(refresh_token, "refresh")
        if data:
            ContenidoPagina.objects.filter(clave="auth.session." + data["sid"]).delete()

    def verify_access_token(self, token):
        data = self._decode(token, "access")
        return self._principal(data["sub"]) if data else None
