"""Cierre de los límites 1 y 3 de docs/RBAC.md: nadie otorga permisos que no posee.

Cubre `POST admin/users/`, `POST admin/roles/` y `PATCH admin/roles/{id}/`.
`admin.all` (Ingeniero) puede otorgar cualquier permiso.
"""
import io

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from persistence.models import HistorialActividad, Permiso, Rol, RolPermiso, Usuario, UsuarioRol

API = "/api/v1/"
PASSWORD = "Owner!Robusto2026"


class PrivilegeEscalationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_access_control", stdout=io.StringIO())
        cls.engineer = cls._user("ing@example.com", Rol.objects.get(nombre="Ingeniero"))
        # Gestor: puede administrar roles y usuarios, pero no es admin.all.
        gestor = Rol.objects.create(nombre="Gestor")
        for name in ("users.manage", "roles.manage", "properties.create", "properties.edit.own"):
            RolPermiso.objects.create(rol=gestor, permiso=Permiso.objects.get(nombre=name))
        cls.gestor_role = gestor
        cls.gestor = cls._user("gestor@example.com", gestor)

    @staticmethod
    def _user(email, role):
        user = Usuario.objects.create(nombre=email, correo=email, password_hash=make_password(PASSWORD))
        UsuarioRol.objects.create(usuario=user, rol=role)
        return user

    def setUp(self):
        cache.clear()

    def client_for(self, user):
        client = APIClient()
        response = client.post(API + "auth/login/", {"email": user.correo, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        client.credentials(HTTP_AUTHORIZATION="Bearer " + response.json()["access"])
        return client

    # --- roles (límite 3) -------------------------------------------------
    def test_roles_manage_cannot_create_role_with_foreign_permissions(self):
        before = Rol.objects.count()
        response = self.client_for(self.gestor).post(
            API + "admin/roles/", {"name": "Superrol", "permissions": ["admin.all"]}, format="json")
        self.assertEqual(response.status_code, 403, response.content)
        self.assertEqual(Rol.objects.count(), before)

    def test_roles_manage_can_create_role_within_own_permissions(self):
        response = self.client_for(self.gestor).post(
            API + "admin/roles/", {"name": "Capturista", "permissions": ["properties.create"]}, format="json")
        self.assertEqual(response.status_code, 201, response.content)

    def test_roles_manage_cannot_raise_own_role_to_admin_all(self):
        response = self.client_for(self.gestor).patch(
            API + f"admin/roles/{self.gestor_role.pk}/",
            {"permissions": ["users.manage", "roles.manage", "admin.all"]}, format="json")
        self.assertEqual(response.status_code, 403, response.content)
        self.assertFalse(self.gestor_role.permisos.filter(nombre="admin.all").exists())

    def test_roles_manage_cannot_grant_foreign_permission_to_another_role(self):
        empleado = Rol.objects.get(nombre="Empleado")
        current = list(empleado.permisos.values_list("nombre", flat=True))
        response = self.client_for(self.gestor).patch(
            API + f"admin/roles/{empleado.pk}/", {"permissions": [*current, "audit.read"]}, format="json")
        self.assertEqual(response.status_code, 403, response.content)
        self.assertFalse(empleado.permisos.filter(nombre="audit.read").exists())

    def test_roles_manage_can_keep_or_remove_permissions_it_does_not_hold(self):
        # Conservar o quitar no escala privilegios: solo cuentan los permisos que se agregan.
        arquitecta = Rol.objects.get(nombre="Arquitecta")
        current = list(arquitecta.permisos.values_list("nombre", flat=True))
        client = self.client_for(self.gestor)
        self.assertEqual(client.patch(API + f"admin/roles/{arquitecta.pk}/", {"description": "x"},
                                      format="json").status_code, 200)
        self.assertEqual(client.patch(API + f"admin/roles/{arquitecta.pk}/", {"permissions": current},
                                      format="json").status_code, 200)
        self.assertEqual(client.patch(API + f"admin/roles/{arquitecta.pk}/", {"permissions": current[:-1]},
                                      format="json").status_code, 200)

    def test_admin_all_can_grant_any_permission(self):
        client = self.client_for(self.engineer)
        response = client.post(
            API + "admin/roles/", {"name": "Auditor", "permissions": ["audit.read", "audit.export"]},
            format="json")
        self.assertEqual(response.status_code, 201, response.content)

    # --- cuentas (límite 1) -----------------------------------------------
    def payload(self, role, **changes):
        data = {"name": "Cuenta nueva", "email": "nueva@example.com", "password": "Seguro!2026@Obra",
                "role_id": role.pk, "active": True}
        data.update(changes)
        return data

    def test_users_manage_can_create_account_with_role_within_own_permissions(self):
        role = Rol.objects.create(nombre="Capturista")
        RolPermiso.objects.create(rol=role, permiso=Permiso.objects.get(nombre="properties.create"))
        response = self.client_for(self.gestor).post(API + "admin/users/", self.payload(role), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        audit = HistorialActividad.objects.get(modulo="users", accion="CREAR")
        self.assertEqual(audit.usuario_id, self.gestor.pk)

    def test_users_manage_cannot_create_account_with_higher_role(self):
        before = Usuario.objects.count()
        client = self.client_for(self.gestor)
        for name in ("Ingeniero", "Arquitecta"):
            response = client.post(API + "admin/users/", self.payload(Rol.objects.get(nombre=name)), format="json")
            self.assertEqual(response.status_code, 403, response.content)
        self.assertEqual(Usuario.objects.count(), before)

    def test_users_read_alone_cannot_create_accounts(self):
        role = Rol.objects.create(nombre="Lector")
        RolPermiso.objects.create(rol=role, permiso=Permiso.objects.get(nombre="users.read"))
        reader = self._user("lector@example.com", role)
        response = self.client_for(reader).post(
            API + "admin/users/", self.payload(Rol.objects.get(nombre="Empleado")), format="json")
        self.assertEqual(response.status_code, 403, response.content)

    def test_admin_all_can_create_account_with_any_role(self):
        response = self.client_for(self.engineer).post(
            API + "admin/users/", self.payload(Rol.objects.get(nombre="Ingeniero")), format="json")
        self.assertEqual(response.status_code, 201, response.content)
