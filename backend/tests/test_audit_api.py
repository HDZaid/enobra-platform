"""BE-07: URLs y binding exclusivos de pruebas hasta la integración de Henry."""
import csv
import io
from datetime import datetime, timezone
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import include, path
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
from apps.audit.interfaces import AuditRepository
from apps.common import registry
from persistence.audit import DjangoAuditRepository
from persistence.models import HistorialActividad, Usuario

urlpatterns = [path("api/v1/", include("apps.audit.urls"))]
URL = "/api/v1/admin/audit/"


@override_settings(ROOT_URLCONF=__name__)
class AuditAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = Usuario.objects.create(nombre="Usuario de prueba", correo="private@example.com",
                                          password_hash="private-hash")
        cls.other = Usuario.objects.create(nombre="Otra persona", correo="other@example.com",
                                           password_hash="other-hash")

    def setUp(self):
        self.repo = DjangoAuditRepository()
        binding = patch.dict(registry._registry, {AuditRepository: self.repo})
        binding.start()
        self.addCleanup(binding.stop)
        self.client = self.client_with("audit.read", "audit.export")

    def client_with(self, *permissions):
        client = APIClient()
        client.force_authenticate(Principal(id=str(self.user.pk), name="Prueba",
            email="private@example.com", role="custom", permissions=frozenset(permissions)))
        return client

    def event(self, **kwargs):
        data = dict(usuario=self.user, accion="EDITAR", modulo="projects", id_registro=7,
                    nombre_registro="Casa", descripcion="Cambio de título",
                    fecha=datetime(2026, 10, 23, 12, tzinfo=timezone.utc))
        data.update(kwargs)
        return HistorialActividad.objects.create(**data)

    def csv_response(self, client=None, params=None):
        response = (client or self.client).get(URL + "export/", params or {})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        content = b"".join(response.streaming_content).decode("utf-8")
        return response, list(csv.reader(io.StringIO(content)))

    def test_permissions_are_independent(self):
        self.event()
        for suffix in ("", "export/"):
            self.assertEqual(APIClient().get(URL + suffix).status_code, 401)
            self.assertEqual(self.client_with().get(URL + suffix).status_code, 403)
        read = self.client_with("audit.read")
        self.assertEqual(read.get(URL).status_code, 200)
        self.assertEqual(read.get(URL + "export/").status_code, 403)
        export = self.client_with("audit.export")
        self.assertEqual(export.get(URL).status_code, 403)
        self.csv_response(export)
        self.assertEqual(self.client_with("admin.all").get(URL).status_code, 200)

    def test_contract_and_user_privacy(self):
        event = self.event()
        response = self.client.get(URL)
        body = response.json()
        self.assertEqual(set(body), {"count", "page", "page_size", "results"})
        row = body["results"][0]
        self.assertEqual(set(row), {"id", "user", "action", "module", "record_id",
                                    "record_name", "description", "date"})
        self.assertEqual(row["id"], event.pk)
        self.assertEqual(row["user"], {"id": self.user.pk, "name": self.user.nombre})
        for secret in (self.user.correo, self.user.password_hash):
            self.assertNotIn(secret, response.content.decode())
        _, rows = self.csv_response()
        self.assertNotIn(self.user.correo, str(rows))
        self.assertNotIn(self.user.password_hash, str(rows))

    def test_combined_filters_and_csv_use_same_selection(self):
        chosen = self.event(descripcion="Objetivo especial")
        self.event(usuario=self.other, descripcion="Objetivo especial")
        self.event(modulo="properties", descripcion="Objetivo especial")
        self.event(accion="CREAR", descripcion="Objetivo especial")
        self.event(descripcion="Sin coincidencia")
        self.event(fecha=datetime(2026, 10, 22, 12, tzinfo=timezone.utc), descripcion="Objetivo especial")
        params = dict(user_id=self.user.pk, module="projects", action="EDITAR",
                      date_from="2026-10-23", date_to="2026-10-23", q="objetivo")
        response = self.client.get(URL, params).json()
        self.assertEqual(response["count"], 1)
        self.assertEqual(response["results"][0]["id"], chosen.pk)
        _, rows = self.csv_response(params=params)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][0], str(chosen.pk))

    def test_search_matches_name_or_description_case_insensitively(self):
        one = self.event(nombre_registro="OBJETIVO", descripcion=None)
        two = self.event(descripcion="Otro objetivo")
        self.event(nombre_registro=None, descripcion=None)
        rows = self.client.get(URL, {"q": "objetivo"}).json()["results"]
        self.assertEqual({row["id"] for row in rows}, {one.pk, two.pk})

    @override_settings(TIME_ZONE="UTC")
    def test_guatemala_day_boundaries_ignore_server_timezone(self):
        moments = ((23, 5, 59, 59, 999999), (23, 6, 0, 0, 0),
                   (24, 5, 59, 59, 999999), (24, 6, 0, 0, 0))
        events = [self.event(fecha=datetime(2026, 10, day, hour, minute, second, micro,
                   tzinfo=timezone.utc)) for day, hour, minute, second, micro in moments]
        params = {"date_from": "2026-10-23", "date_to": "2026-10-23"}
        rows = self.client.get(URL, params).json()["results"]
        self.assertEqual([row["id"] for row in rows], [events[2].pk, events[1].pk])
        self.assertEqual(self.client.get(URL, {"date_from": "2026-10-23"}).json()["count"], 3)
        self.assertEqual(self.client.get(URL, {"date_to": "2026-10-23"}).json()["count"], 3)
        _, exported = self.csv_response(params=params)
        self.assertTrue(exported[1][-1].endswith("-06:00"))

    def test_order_pagination_and_ties(self):
        old = self.event(fecha=datetime(2026, 10, 22, 12, tzinfo=timezone.utc))
        first = self.event()
        second = self.event()
        page = self.client.get(URL, {"page_size": 2}).json()
        self.assertEqual(page["count"], 3)
        self.assertEqual([r["id"] for r in page["results"]], [second.pk, first.pk])
        page = self.client.get(URL, {"page_size": 2, "page": 2}).json()
        self.assertEqual([r["id"] for r in page["results"]], [old.pk])
        self.assertEqual(self.client.get(URL, {"page": 99}).json()["results"], [])

    def test_invalid_queries_are_rejected(self):
        filters = ({"user_id": 0}, {"user_id": "abc"}, {"date_from": "not-a-date"},
                   {"date_to": "2026-02-30"}, {"date_from": "2026-10-24", "date_to": "2026-10-23"})
        for params in filters:
            for suffix in ("", "export/"):
                with self.subTest(params=params, suffix=suffix):
                    self.assertEqual(self.client.get(URL + suffix, params).status_code, 400)
        for params in ({"page_size": 101}, {"page_size": 0}, {"page": 0}):
            self.assertEqual(self.client.get(URL, params).status_code, 400)

    def test_empty_results_and_nullable_csv_values(self):
        self.assertEqual(self.client.get(URL).json()["count"], 0)
        _, rows = self.csv_response()
        self.assertEqual(len(rows), 1)
        self.event(id_registro=None, nombre_registro=None, descripcion=None)
        _, rows = self.csv_response()
        self.assertEqual(rows[1][5:8], ["", "", ""])

    def test_csv_neutralizes_all_formula_prefixes_and_quotes_content(self):
        self.user.nombre = "@SUM(1)"
        self.user.save(update_fields=["nombre"])
        self.event(accion="+CMD()", modulo="-CMD()", nombre_registro="=CMD()",
                   descripcion='Texto, "comillas"\ny salto')
        _, rows = self.csv_response()
        row = rows[1]
        self.assertEqual(row[2:5], ["'@SUM(1)", "'+CMD()", "'-CMD()"])
        self.assertEqual(row[6], "'=CMD()")
        self.assertEqual(row[7], 'Texto, "comillas"\ny salto')
        for value in (" =CMD()", "\t=CMD()", "\r=CMD()"):
            HistorialActividad.objects.all().delete()
            self.event(nombre_registro=value)
            _, rows = self.csv_response()
            self.assertEqual(rows[1][6], "'" + value)

    def test_export_is_lazy_and_uses_single_joined_query(self):
        for _ in range(4):
            self.event()
        with self.assertNumQueries(0):
            response = self.client.get(URL + "export/")
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("attachment", response["Content-Disposition"])
        with self.assertNumQueries(1):
            rows = list(csv.reader(io.StringIO(b"".join(response.streaming_content).decode())))
        self.assertEqual(len(rows), 5)
        with self.assertNumQueries(2):
            self.assertEqual(self.repo.list({}, 1, 100).total, 4)

    def test_export_limit_and_list_maximum(self):
        HistorialActividad.objects.bulk_create([
            HistorialActividad(usuario=self.user, accion="EDITAR", modulo="projects",
                fecha=datetime(2026, 10, 23, 12, tzinfo=timezone.utc)) for _ in range(10_001)])
        self.assertEqual(len(self.client.get(URL, {"page_size": 100}).json()["results"]), 100)
        _, rows = self.csv_response(params={"page": 2, "page_size": 1})
        self.assertEqual(len(rows), 10_001)  # header + 10 000; pagination does not limit CSV.
        self.assertGreater(int(rows[1][0]), int(rows[-1][0]))

    def test_unbound_repository_returns_501(self):
        with patch.dict(registry._registry):
            registry._registry.pop(AuditRepository, None)
            self.assertEqual(self.client.get(URL).status_code, 501)
            self.assertEqual(self.client.get(URL + "export/").status_code, 501)
