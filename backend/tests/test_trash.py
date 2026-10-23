"""Pruebas de BE-04: exclusivamente con config.test_settings.

BE-00: la URL unificada se monta solo en este URLConf de pruebas hasta que
Henry la registre en config/urls.py. BE-01/02: se simulan permisos oficiales
con Principal; no se cambian los cat?logos ni roles de producci?n.
"""
from unittest.mock import patch

from datetime import date, timedelta
from django.utils import timezone
from django.test import TestCase, override_settings
from django.urls import include, path
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
from apps.common.registry import resolve
from apps.projects.interfaces import ProjectRepository
from apps.properties.interfaces import PropertyRepository
from persistence.models import (Proyecto, Propiedad, Noticia, ContenidoPagina,
    HistorialActividad, MensajeContacto, ProyectoVideo)
from persistence.support import write_data
from tests import test_admin_api as admin_tests

API = admin_tests.API

urlpatterns = [
    path("", include("config.urls")),
    path("api/v1/", include("apps.publications.urls")),
]


@override_settings(ROOT_URLCONF=__name__)
class TrashTests(TestCase):
    setUpTestData = classmethod(admin_tests.AdminAPITests.setUpTestData.__func__)
    setUp = admin_tests.AdminAPITests.setUp
    payload = admin_tests.AdminAPITests.payload
    create = admin_tests.AdminAPITests.create

    def principal_client(self, *permissions, owner=None):
        owner = owner or self.user
        client = APIClient()
        client.force_authenticate(Principal(id=str(owner.pk), name="Prueba",
            email="test@example.com", role="custom", permissions=frozenset(permissions)))
        return client

    def repo(self, kind):
        return resolve(ProjectRepository if kind == "projects" else PropertyRepository)

    def test_project_lifecycle_and_publication_state(self):
        for published in (True, False):
            with self.subTest(published=published):
                item = self.create("projects", published=published)
                slug = item["id"]
                detail = API + f"projects/{slug}/"
                permanent = API + f"admin/projects/{slug}/permanent/"
                self.assertEqual(self.client.delete(permanent).status_code, 404)
                self.assertEqual(self.client.delete(detail).status_code, 204)
                self.assertTrue(Proyecto.objects.filter(slug=slug).exists())
                for client in (self.client, self.public):
                    self.assertEqual(client.get(detail).status_code, 404)
                    self.assertEqual(client.get(API + "projects/").json()["count"], 0)
                    self.assertEqual(client.get(API + "projects/years/").json()["years"], [])
                self.assertEqual(self.client.delete(detail).status_code, 404)
                rows = self.client.get(API + "admin/projects/trash/").json()
                self.assertEqual(rows["count"], 1)
                self.assertEqual(rows["results"][0]["id"], slug)
                self.assertEqual(self.client.post(API + f"admin/projects/{slug}/restore/").status_code, 204)
                self.assertEqual(self.client.get(detail).json()["published"], published)
                self.assertEqual(self.public.get(detail).status_code, 200 if published else 404)
                self.assertEqual(self.client.post(API + f"admin/projects/{slug}/restore/").status_code, 404)
                self.assertEqual(self.client.delete(detail).status_code, 204)
                self.assertEqual(self.client.delete(permanent).status_code, 204)
                self.assertFalse(Proyecto.objects.filter(slug=slug).exists())
                self.assertFalse(ContenidoPagina.objects.filter(clave__startswith="admin.projects.").exists())
        actions = set(HistorialActividad.objects.filter(modulo="projects").values_list("accion", flat=True))
        self.assertEqual(actions, {"CREAR", "PAPELERA", "RESTAURAR", "ELIMINAR_PERMANENTE"})

    def test_properties_preserve_existing_lifecycle(self):
        item = self.create("properties")
        key = item["id"]
        self.assertEqual(self.client.delete(API + f"properties/{key}/").status_code, 204)
        self.assertEqual(self.client.get(API + "admin/properties/trash/").json()["count"], 1)
        self.assertEqual(self.client.post(API + f"admin/properties/{key}/restore/").status_code, 204)
        self.assertTrue(Propiedad.objects.get(pk=key).publicado)
        self.assertEqual(self.client.delete(API + f"properties/{key}/").status_code, 204)
        self.assertEqual(self.client.delete(API + f"admin/properties/{key}/permanent/").status_code, 204)
        self.assertFalse(Propiedad.objects.exists())

    def test_news_still_deletes_permanently(self):
        item = self.create("news")
        self.assertEqual(self.client.delete(API + f"news/{item['id']}/").status_code, 204)
        self.assertFalse(Noticia.objects.exists())
        self.assertFalse(ContenidoPagina.objects.filter(clave__startswith="admin.news.").exists())
        self.assertTrue(HistorialActividad.objects.filter(modulo="news", accion="ELIMINAR").exists())

    def test_unified_contract_and_metadata_survive_restoration(self):
        for kind in ("projects", "properties"):
            item = self.create(kind)
            self.repo(kind).delete(item["id"], deleted_by=self.other.pk)
            response = self.client.get(API + "admin/trash/", {"type": kind})
            self.assertEqual(response.status_code, 200)
            result = response.json()["results"][0]
            self.assertEqual(set(result), {"type", "id", "title", "trashed_at", "trashed_by",
                "trashed_by_name", "was_published", "owner_id"})
            self.assertEqual(result["id"], str(item["id"]))
            self.assertEqual(result["type"], kind)
            self.assertEqual(result["trashed_by"], str(self.other.pk))
            self.assertEqual(result["trashed_by_name"], self.other.nombre)
            self.assertEqual(result["owner_id"], str(self.user.pk))
            self.assertTrue(result["was_published"])
            self.repo(kind).restore(item["id"], restored_by=self.user.pk)
            restored = self.repo(kind).get(item["id"], include_unpublished=True)
            self.assertEqual(restored["images"], item["images"])
            self.assertEqual(restored["video"], item["video"])
            self.assertEqual(self.client.get(API + "admin/trash/", {"type": kind}).json()["count"], 0)

    def test_unified_permissions_are_scoped_by_type_and_owner(self):
        for kind in ("projects", "properties"):
            own = self.create(kind, published=False)
            data = self.payload(kind, title="Ajeno", published=False)
            if kind == "properties":
                data["date"] = date.fromisoformat(data["date"])
            foreign = self.repo(kind).create(data, created_by=self.other.pk)
            for item in (own, foreign):
                self.repo(kind).delete(item["id"], deleted_by=self.user.pk)
            client = self.principal_client(kind + ".trash.own")
            rows = client.get(API + "admin/trash/", {"type": kind}).json()
            self.assertEqual(rows["count"], 1)
            self.assertEqual(rows["results"][0]["id"], str(own["id"]))
            for permission in ("trash.any", "restore", "delete_permanently"):
                broad = self.principal_client(kind + "." + permission)
                self.assertEqual(broad.get(API + "admin/trash/", {"type": kind}).json()["count"], 2)
            other_kind = "properties" if kind == "projects" else "projects"
            self.assertEqual(client.get(API + "admin/trash/", {"type": other_kind}).status_code, 403)
            self.assertEqual(self.principal_client().get(API + "admin/trash/", {"type": kind}).status_code, 403)
        self.assertEqual(self.public.get(API + "admin/trash/?type=projects").status_code, 401)

    def test_project_trash_permissions_and_missing_records(self):
        item = self.create("projects", published=False)
        foreign = self.repo("projects").create(self.payload("projects", title="Otro"), created_by=self.other.pk)
        for obj in (item, foreign):
            self.repo("projects").delete(obj["id"], deleted_by=self.user.pk)
        own = self.principal_client("projects.trash.own")
        self.assertEqual(own.get(API + "admin/projects/trash/").json()["count"], 1)
        self.assertEqual(own.post(API + f"admin/projects/{item['id']}/restore/").status_code, 403)
        self.assertEqual(own.delete(API + f"admin/projects/{item['id']}/permanent/").status_code, 403)
        restore = self.principal_client("projects.restore")
        self.assertEqual(restore.post(API + f"admin/projects/{item['id']}/restore/").status_code, 204)
        delete = self.principal_client("projects.delete_permanently")
        self.assertEqual(delete.delete(API + f"admin/projects/{foreign['id']}/permanent/").status_code, 204)
        self.assertEqual(delete.delete(API + "admin/projects/missing/permanent/").status_code, 404)
        self.assertEqual(restore.post(API + "admin/projects/missing/restore/").status_code, 404)
        for url in ("admin/projects/trash/", f"admin/projects/{item['id']}/restore/"):
            self.assertEqual(self.public.get(API + url).status_code, 401)

    def test_unified_validation_and_pagination(self):
        for query in ({}, {"type": "news"}, {"type": "projects", "page": 0},
                      {"type": "projects", "page_size": 101}):
            self.assertEqual(self.client.get(API + "admin/trash/", query).status_code, 400)
        for index in range(3):
            item = self.create("projects", title=f"Proyecto {index}")
            self.repo("projects").delete(item["id"], deleted_by=self.user.pk)
        response = self.client.get(API + "admin/trash/", {"type": "projects", "page": 2, "page_size": 2}).json()
        self.assertEqual(response["count"], 3)
        self.assertEqual(len(response["results"]), 1)
        self.assertEqual(response["page"], 2)
        self.assertEqual(self.client.get(API + "admin/trash/?type=projects&page=9").json()["results"], [])

    def test_trash_queries_do_not_grow_with_record_count(self):
        for kind in ("projects", "properties"):
            repo = self.repo(kind)
            item = self.create(kind)
            repo.delete(item["id"], deleted_by=self.user.pk)
            with self.assertNumQueries(1):
                self.assertEqual(len(repo._trashed_ids()), 1)
            with self.assertNumQueries(5):
                self.assertEqual(repo.list_trash(page=1, page_size=20).total, 1)
            for index in range(3):
                item = self.create(kind, title=f"Extra {index}")
                repo.delete(item["id"], deleted_by=self.user.pk)
            with self.assertNumQueries(1):
                self.assertEqual(len(repo._trashed_ids()), 4)
            with self.assertNumQueries(5):
                self.assertEqual(repo.list_trash(page=1, page_size=20).total, 4)

    def test_invalid_trash_metadata_is_ignored(self):
        for key, value in (("admin.projects.bad", {"trash": {"trashed_at": "x"}}),
                           ("admin.projects.999", {"trash": None})):
            write_data(key, value)
        ContenidoPagina.objects.create(clave="admin.projects.998", contenido='{"trash":broken')
        self.assertEqual(self.repo("projects")._trashed_ids(), [])

    def test_audit_failure_rolls_back_trash_and_restore(self):
        item = self.create("projects")
        repo = self.repo("projects")
        with patch("persistence.catalog.audit", side_effect=RuntimeError("audit failed")):
            with self.assertRaises(RuntimeError):
                repo.delete(item["id"], deleted_by=self.user.pk)
        self.assertTrue(repo.get(item["id"], include_unpublished=True)["published"])
        repo.delete(item["id"], deleted_by=self.user.pk)
        with patch("persistence.catalog.audit", side_effect=RuntimeError("audit failed")):
            with self.assertRaises(RuntimeError):
                repo.restore(item["id"], restored_by=self.user.pk)
        self.assertIsNone(repo.get(item["id"], include_unpublished=True))
        self.assertEqual(repo.list_trash(page=1, page_size=12).total, 1)

    def test_own_draft_uses_project_slug_and_excludes_trash(self):
        item = self.create("projects", published=False)
        repo = self.repo("projects")
        self.assertTrue(repo.is_own_draft(item["id"], self.user.pk))
        self.assertFalse(repo.is_own_draft(item["id"], self.other.pk))
        self.assertFalse(repo.is_own_draft(item["id"], "invalid"))
        repo.delete(item["id"], deleted_by=self.user.pk)
        self.assertFalse(repo.is_own_draft(item["id"], self.user.pk))

    def test_trash_and_restore_do_not_reconcile_sql_cleanup_state(self):
        # DEC-05: SQL cleanup is a separate lifecycle, pending coordination.
        for published in (False, True):
            item = self.create("projects", published=published)
            obj = Proyecto.objects.get(slug=item["id"])
            activity = timezone.now() - timedelta(days=150)
            marked = timezone.now() - timedelta(days=31)
            Proyecto.objects.filter(pk=obj.pk).update(
                fecha_ultima_actividad=activity,
                estado_limpieza="PENDIENTE_ELIMINACION",
                fecha_marcado_eliminacion=marked)
            repo = self.repo("projects")
            self.assertTrue(repo.delete(item["id"], deleted_by=self.user.pk))
            self.assertTrue(repo.restore(item["id"], restored_by=self.user.pk))
            obj.refresh_from_db()
            self.assertEqual(obj.publicado, published)
            self.assertEqual(obj.fecha_ultima_actividad, activity)
            self.assertEqual(obj.estado_limpieza, "PENDIENTE_ELIMINACION")
            self.assertEqual(obj.fecha_marcado_eliminacion, marked)

    def test_permanent_delete_preserves_messages_and_audit_but_removes_videos(self):
        item = self.create("projects")
        obj = Proyecto.objects.get(slug=item["id"])
        pk = obj.pk
        message = MensajeContacto.objects.create(
            nombre="Prueba", mensaje="Consulta conservada", proyecto=obj, origen="PROYECTO")
        self.assertTrue(ProyectoVideo.objects.filter(proyecto_id=pk).exists())
        repo = self.repo("projects")
        repo.delete(item["id"], deleted_by=self.user.pk)
        self.assertTrue(ProyectoVideo.objects.filter(proyecto_id=pk).exists())
        message.refresh_from_db()
        self.assertEqual(message.proyecto_id, pk)
        self.assertTrue(repo.delete_permanently(item["id"], deleted_by=self.user.pk))
        self.assertFalse(ProyectoVideo.objects.filter(proyecto_id=pk).exists())
        message.refresh_from_db()
        self.assertIsNone(message.proyecto_id)
        self.assertEqual(message.mensaje, "Consulta conservada")
        self.assertTrue(HistorialActividad.objects.filter(
            modulo="projects", id_registro=pk, accion="ELIMINAR_PERMANENTE").exists())

    def test_permanent_delete_failure_rolls_back_metadata_and_audit(self):
        item = self.create("projects")
        repo = self.repo("projects")
        repo.delete(item["id"], deleted_by=self.user.pk)
        with patch.object(Proyecto, "delete", side_effect=RuntimeError("delete failed")):
            with self.assertRaises(RuntimeError):
                repo.delete_permanently(item["id"], deleted_by=self.user.pk)
        self.assertEqual(repo.list_trash(page=1, page_size=12).total, 1)
        self.assertFalse(HistorialActividad.objects.filter(accion="ELIMINAR_PERMANENTE").exists())

    def test_missing_project_with_orphan_metadata_cannot_be_restored(self):
        item = self.create("projects")
        repo = self.repo("projects")
        repo.delete(item["id"], deleted_by=self.user.pk)
        # Local simulation of a missing row; never invokes the Supabase function.
        Proyecto.objects.get(slug=item["id"]).delete()
        self.assertTrue(ContenidoPagina.objects.filter(clave__startswith="admin.projects.").exists())
        self.assertEqual(repo.list_trash(page=1, page_size=12).total, 0)
        self.assertFalse(repo.restore(item["id"], restored_by=self.user.pk))
        self.assertFalse(repo.delete_permanently(item["id"], deleted_by=self.user.pk))
        self.assertFalse(HistorialActividad.objects.filter(accion="RESTAURAR").exists())
