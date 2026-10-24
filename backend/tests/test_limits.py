"""BE-06a: límites de propiedades y recuperación de errores decimales."""
from decimal import InvalidOperation
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
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
