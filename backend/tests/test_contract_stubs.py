"""BE-00: los contratos nuevos existen y validan permisos y entrada.

Los que aun no tienen logica (edicion de usuarios, BE-08) responden 501; el historial
ya es real (BE-07) y esta registrado en config/bindings.py."""
import io

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from persistence.models import Permiso, Rol, RolPermiso, Usuario, UsuarioRol

API = "/api/v1/"
PASSWORD = "Stub!Robusto2026"


class ContractStubTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_access_control", stdout=io.StringIO())
        cls.engineer = cls._user("ingeniero@example.com", "Ingeniero")
        cls.employee = cls._user("empleado@example.com", "Empleado")
        reader = Rol.objects.create(nombre="Lector de historial")
        RolPermiso.objects.create(rol=reader, permiso=Permiso.objects.get(nombre="audit.read"))
        cls.reader = cls._user("lector@example.com", "Lector de historial")

    @staticmethod
    def _user(email, role_name):
        user = Usuario.objects.create(nombre=role_name, correo=email, password_hash=make_password(PASSWORD))
        UsuarioRol.objects.create(usuario=user, rol=Rol.objects.get(nombre=role_name))
        return user

    def setUp(self):
        cache.clear()

    def client_for(self, user=None):
        client = APIClient()
        if user is not None:
            response = client.post(API + "auth/login/", {"email": user.correo, "password": PASSWORD}, format="json")
            self.assertEqual(response.status_code, 200, response.content)
            client.credentials(HTTP_AUTHORIZATION="Bearer " + response.json()["access"])
        return client

    def requests(self):
        target = self.employee.pk
        return [
            ("get", "admin/audit/", None),
            ("get", "admin/audit/export/", None),
            ("patch", f"admin/users/{target}/", {"name": "Nuevo nombre"}),
            ("put", f"admin/users/{target}/role/", {"role_id": Rol.objects.get(nombre="Empleado").pk}),
        ]

    def stub_requests(self):
        return [r for r in self.requests() if not r[1].startswith("admin/audit/")]

    def call(self, client, method, path, body):
        return getattr(client, method)(API + path, body, format="json") if body else getattr(client, method)(API + path)

    def test_anonymous_gets_401(self):
        client = self.client_for()
        for method, path, body in self.requests():
            with self.subTest(path=path):
                response = self.call(client, method, path, body)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json()["error"]["code"], "not_authenticated")

    def test_without_permission_gets_403(self):
        client = self.client_for(self.employee)
        for method, path, body in self.requests():
            with self.subTest(path=path):
                response = self.call(client, method, path, body)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()["error"]["code"], "permission_denied")

    def test_with_permission_gets_501_not_implemented(self):
        client = self.client_for(self.engineer)
        for method, path, body in self.stub_requests():
            with self.subTest(path=path):
                response = self.call(client, method, path, body)
                self.assertEqual(response.status_code, 501, response.content)
                self.assertEqual(response.json()["error"]["code"], "not_implemented")

    def test_input_is_validated_before_501(self):
        client = self.client_for(self.engineer)
        target = self.employee.pk
        cases = [
            ("get", "admin/audit/?date_from=2026-10-20&date_to=2026-10-01", None),
            ("get", "admin/audit/?page_size=101", None),
            ("get", "admin/audit/export/?user_id=0", None),
            ("patch", f"admin/users/{target}/", {"active": "talvez"}),
            ("put", f"admin/users/{target}/role/", {"role_id": 0}),
        ]
        for method, path, body in cases:
            with self.subTest(path=path):
                response = self.call(client, method, path, body)
                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(response.json()["error"]["code"], "validation_error")
        response = client.patch(API + f"admin/users/{target}/", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_audit_read_does_not_grant_export(self):
        client = self.client_for(self.reader)
        self.assertEqual(client.get(API + "admin/audit/").status_code, 200)
        self.assertEqual(client.get(API + "admin/audit/export/").status_code, 403)
        self.assertEqual(client.patch(API + f"admin/users/{self.employee.pk}/", {"name": "X"}, format="json").status_code, 403)

    def test_audit_is_bound_in_the_real_registry(self):
        """BE-07 queda conectado: con permiso responde 200 (no 501) sin parches de prueba."""
        client = self.client_for(self.engineer)
        self.assertEqual(client.get(API + "admin/audit/").status_code, 200)
        self.assertEqual(client.get(API + "admin/audit/export/").status_code, 200)

    def test_inquiry_notifier_is_bound_to_email(self):
        from apps.common.registry import resolve
        from apps.inquiries.notifiers import InquiryNotifier
        from persistence.notifiers import EmailInquiryNotifier

        self.assertIsInstance(resolve(InquiryNotifier), EmailInquiryNotifier)
