"""BE-06a: límites de propiedades y recuperación de errores decimales."""
from decimal import InvalidOperation
from datetime import date
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
from persistence.catalog import DjangoPropertyRepository
from persistence.models import ContenidoPagina, HistorialActividad, Propiedad, Usuario


URL = "/api/v1/properties/"
LIMITS = {"price": 9_999_999_999, "area": 99_999_999,
          "rooms": 999, "baths": 999, "parking": 999}


class PropertyLimitsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = Usuario.objects.create(
            nombre="Ingeniero", correo="limits@example.com", password_hash="unused",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(Principal(
            id=str(self.user.pk), name=self.user.nombre, email=self.user.correo,
            role="Ingeniero", permissions=frozenset({"admin.all"}),
        ))

    def payload(self, **changes):
        data = {
            "title": "Casa de prueba", "operation": "Venta", "type": "Casa",
            "zone": "Zona 9", "location": "Quetzaltenango", "price": 500000,
            "rooms": 3, "baths": 2, "parking": 1, "area": 150,
            "date": "2026-10-23", "description": "Descripción completa",
            "commercial": "Condiciones", "images": ["https://example.com/photo.jpg"],
            "renders": [], "video": "", "demo": True, "published": True,
        }
        data.update(changes)
        return data

    def create_property(self):
        response = self.client.post(URL, self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return URL + str(response.json()["id"]) + "/"

    def snapshot(self):
        return {
            "properties": list(Propiedad.objects.order_by("pk").values()),
            "metadata": list(ContenidoPagina.objects.order_by("pk").values()),
            "audit": list(HistorialActividad.objects.order_by("pk").values()),
        }

    def test_maximum_values_are_persisted_for_post_put_and_patch(self):
        url = self.create_property()
        for method in ("post", "put", "patch"):
            for field, maximum in LIMITS.items():
                with self.subTest(method=method, field=field):
                    data = {field: maximum} if method == "patch" else self.payload(**{field: maximum})
                    target = URL if method == "post" else url
                    response = getattr(self.client, method)(target, data, format="json")
                    self.assertEqual(response.status_code, 201 if method == "post" else 200, response.content)
                    self.assertEqual(response.json()[field], maximum)
                    stored = self.client.get(target + str(response.json()["id"]) + "/" if method == "post" else target)
                    self.assertEqual(stored.status_code, 200, stored.content)
                    self.assertEqual(stored.json()[field], maximum)

    def test_first_value_above_each_maximum_is_rejected_without_writes(self):
        url = self.create_property()
        for method in ("post", "put", "patch"):
            for field, maximum in LIMITS.items():
                with self.subTest(method=method, field=field):
                    before = self.snapshot()
                    data = {field: maximum + 1} if method == "patch" else self.payload(**{field: maximum + 1})
                    response = getattr(self.client, method)(URL if method == "post" else url, data, format="json")
                    self.assertEqual(response.status_code, 400, response.content)
                    self.assertEqual(response.json()["error"]["code"], "validation_error")
                    self.assertIn(field, response.json()["error"]["details"])
                    self.assertEqual(self.snapshot(), before)

    def test_decimal_failure_returns_400_and_rolls_back_writes(self):
        url = self.create_property()
        for method in ("post", "put", "patch"):
            with self.subTest(method=method):
                before = self.snapshot()
                # Falla después de guardar la fila, dentro de la transacción real.
                with patch("persistence.catalog.CatalogRepository._extras", side_effect=InvalidOperation("internal detail")):
                    data = {"price": 100} if method == "patch" else self.payload(price=100)
                    response = getattr(self.client, method)(URL if method == "post" else url, data, format="json")
                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(response.json()["error"]["code"], "validation_error")
                self.assertNotIn("internal detail", response.content.decode())
                self.assertEqual(self.snapshot(), before)


class PropertyDraftAuthorizationTests(TestCase):
    """BE-06b: el estado al escribir prevalece sobre una lectura previa del borrador."""

    @classmethod
    def setUpTestData(cls):
        cls.employee = Usuario.objects.create(
            nombre="Empleado", correo="draft-employee@example.com", password_hash="unused",
        )
        cls.other = Usuario.objects.create(
            nombre="Otro", correo="draft-other@example.com", password_hash="unused",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(Principal(
            id=str(self.employee.pk), name=self.employee.nombre, email=self.employee.correo,
            role="Empleado", permissions=frozenset({"properties.edit.own", "properties.trash.own"}),
        ))
        self.repository = DjangoPropertyRepository()
        self.item = self.repository.create(
            PropertyLimitsTests.payload(self, published=False, date=date(2026, 10, 23)),
            created_by=str(self.employee.pk),
        )
        self.url = URL + str(self.item["id"]) + "/"

    def request_write(self, method):
        data = PropertyLimitsTests.payload(self, published=False, title="Cambio del empleado")
        if method == "patch":
            data = {"title": "Cambio del empleado"}
        return getattr(self.client, method)(self.url, data, format="json")

    def test_publication_before_employee_write_returns_403_without_changes(self):
        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                Propiedad.objects.filter(pk=self.item["id"]).update(publicado=False)
                self.assertTrue(self.repository.is_own_draft(self.item["id"], self.employee.pk))
                operation = "delete" if method == "delete" else "update"
                original = getattr(DjangoPropertyRepository, operation)
                snapshots = []

                def publish_then_write(repository, key, *args, **kwargs):
                    # Intercalado determinista: otro escritor publica antes del bloqueo.
                    Propiedad.objects.filter(pk=key).update(publicado=True)
                    snapshots.append(PropertyLimitsTests.snapshot(self))
                    return original(repository, key, *args, **kwargs)

                with patch.object(DjangoPropertyRepository, operation, autospec=True,
                                  side_effect=publish_then_write):
                    response = self.request_write(method)
                self.assertEqual(response.status_code, 403, response.content)
                self.assertEqual(response.json()["error"]["code"], "permission_denied")
                self.assertEqual(PropertyLimitsTests.snapshot(self), snapshots[0])

    def test_another_owners_draft_cannot_be_written_or_trashed(self):
        Propiedad.objects.filter(pk=self.item["id"]).update(creado_por=self.other)
        before = PropertyLimitsTests.snapshot(self)
        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                response = self.request_write(method)
                self.assertEqual(response.status_code, 403, response.content)
                self.assertEqual(PropertyLimitsTests.snapshot(self), before)

    def test_employee_can_replace_patch_and_trash_own_draft(self):
        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                response = self.request_write(method)
                self.assertEqual(response.status_code, 204 if method == "delete" else 200,
                                 response.content)
