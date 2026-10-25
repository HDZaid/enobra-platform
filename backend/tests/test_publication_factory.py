"""BE-05: fábrica de publicaciones (Abstract Factory) como fuente única de permisos, papelera e historial."""
import io
from datetime import datetime, timezone

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from apps.accounts.access_policy import BUILTIN_ROLES, PERMISSION_CATALOG, permission_catalog
from apps.accounts.interfaces import Principal
from apps.common.pagination import Page
from apps.common.rbac import PLATFORM_PERMISSIONS, publication_permissions, trash_access
from apps.common.registry import resolve
from apps.news.interfaces import NewsRepository
from apps.projects.interfaces import ProjectRepository
from apps.properties.interfaces import PropertyRepository
from apps.publications.factory import ConfiguredPublicationFactory, NewsFactory, PropertyFactory
from apps.publications.registry import PublicationRegistry, publication_registry
from apps.publications.views import TrashQuerySerializer
from persistence.models import Permiso, RolPermiso
from tests.test_rbac_catalog import FROZEN_PERMISSIONS

TRASH = "/api/v1/admin/trash/"


class FakeLandRepository:
    """Repositorio de un tipo que no existe en el sistema real: solo implementa la papelera."""

    def __init__(self):
        self.owner_ids = []

    def list_trash(self, *, page, page_size, owner_id=None):
        self.owner_ids.append(owner_id)
        return Page(items=[{"type": "terrenos", "id": "7", "title": "Lote 7",
                            "trashed_at": datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc),
                            "trashed_by": "1", "trashed_by_name": "Ana", "was_published": True,
                            "owner_id": "1"}], total=1)

    def restore(self, key, *, restored_by):
        return True

    def delete_permanently(self, key, *, deleted_by):
        return True


class LandFactory(ConfiguredPublicationFactory):
    """Un tipo nuevo completo: una clase con tres atributos."""

    key = "terrenos"
    label = "terrenos"


def client_with(*permissions, user_id="5"):
    client = APIClient()
    client.force_authenticate(Principal(id=user_id, name="Prueba", email="p@example.com",
                                        role="custom", permissions=frozenset(permissions)))
    return client


class RegisteredFactoriesTests(SimpleTestCase):
    def test_the_three_publication_types_are_registered_in_order(self):
        self.assertEqual(publication_registry.keys(), ["properties", "projects", "news"])

    def test_kit_attributes(self):
        kits = {kit.key: kit for kit in publication_registry.kits()}
        self.assertEqual({k: (v.supports_trash, v.ownership) for k, v in kits.items()},
                         {"properties": (True, True), "projects": (True, True), "news": (False, False)})
        self.assertEqual({k: v.audit_module for k, v in kits.items()},
                         {"properties": "properties", "projects": "projects", "news": "news"})
        self.assertEqual(publication_registry.trash_keys(), ["properties", "projects"])

    def test_repositories_are_the_same_instances_the_api_resolves(self):
        for key, interface in (("properties", PropertyRepository), ("projects", ProjectRepository),
                               ("news", NewsRepository)):
            self.assertIs(publication_registry.get(key).repository, resolve(interface))

    def test_catalog_comes_from_iterating_the_factories_with_the_same_32_of_be_01(self):
        expected = dict(PLATFORM_PERMISSIONS)
        for kit in publication_registry.kits():
            expected.update(kit.permissions)
        self.assertEqual(dict(PERMISSION_CATALOG), expected)
        self.assertEqual(permission_catalog(), expected)
        self.assertEqual(set(PERMISSION_CATALOG), FROZEN_PERMISSIONS)
        self.assertEqual(len(PERMISSION_CATALOG), 32)

    def test_each_kit_permissions_follow_its_shape(self):
        self.assertEqual(len(publication_registry.get("properties").permissions), 8)
        self.assertEqual(len(publication_registry.get("projects").permissions), 8)
        self.assertEqual(set(publication_registry.get("news").permissions),
                         {"news.create", "news.edit", "news.publish", "news.delete"})

    def test_audit_labels_come_from_the_factories(self):
        self.assertEqual(publication_registry.audit_labels(),
                         {"properties": "Bienes raíces", "projects": "Proyectos", "news": "Noticias"})
        self.assertEqual(publication_registry.audit_label("projects"), "Proyectos")
        self.assertIsNone(publication_registry.audit_label("users"))

    def test_trash_access_names_match_the_generated_permissions(self):
        for ownership in (True, False):
            everything, own = trash_access("x", ownership=ownership)
            generated = set(publication_permissions("x", "equis", ownership=ownership))
            self.assertTrue(set(everything) | set(own) <= generated)

    def test_publication_permissions_without_trash(self):
        self.assertEqual(list(publication_permissions("x", "equis", ownership=True, trash=False)),
                         ["x.create", "x.edit.any", "x.edit.own", "x.publish", "x.delete"])

    def test_builtin_roles_follow_the_live_catalog(self):
        self.assertEqual(set(BUILTIN_ROLES["Ingeniero"]["permissions"]), FROZEN_PERMISSIONS)
        self.assertEqual(set(BUILTIN_ROLES), {"Ingeniero", "Arquitecta", "Empleado"})


class RegistryValidationTests(SimpleTestCase):
    def setUp(self):
        self.registry = PublicationRegistry()
        self.registry.register(LandFactory(FakeLandRepository()))

    def test_duplicate_key_is_rejected_unless_replacing(self):
        with self.assertRaisesMessage(ValueError, "terrenos"):
            self.registry.register(LandFactory(FakeLandRepository()))
        self.registry.register(LandFactory(FakeLandRepository()), replace=True)
        self.assertEqual(self.registry.keys(), ["terrenos"])

    def test_invalid_key_is_rejected(self):
        class Bad(LandFactory):
            key = "Terrenos Nuevos"
        with self.assertRaises(ValueError):
            self.registry.register(Bad(FakeLandRepository()))

    def test_audit_module_must_be_unique(self):
        class Other(LandFactory):
            key = "lotes"
            audit_module = "terrenos"
        with self.assertRaisesMessage(ValueError, "historial"):
            self.registry.register(Other(FakeLandRepository()))

    def test_permissions_must_use_the_kit_prefix(self):
        class Foreign(LandFactory):
            key = "lotes"
            def create_kit(self):
                kit = super().create_kit()
                return type(kit)(**{**kit.__dict__, "permissions": {"properties.create": "Crear."}})
        with self.assertRaisesMessage(ValueError, "empezar por"):
            self.registry.register(Foreign(FakeLandRepository()))

    def test_trash_support_requires_the_repository_methods(self):
        class NoTrash(LandFactory):
            key = "lotes"
        with self.assertRaisesMessage(TypeError, "papelera"):
            self.registry.register(NoTrash(object()))
        class Plain(NoTrash):
            supports_trash = False
        self.registry.register(Plain(object()))  # sin papelera no se exige


class NewPublicationTypeNeedsOnlyAClassAndARegistrationTests(TestCase):
    """Prueba de extensibilidad: "terrenos" no existe en ningún otro archivo del proyecto."""

    def setUp(self):
        self.repository = FakeLandRepository()
        publication_registry.register(LandFactory(self.repository))
        self.addCleanup(publication_registry.unregister, "terrenos")

    def test_permissions_appear_in_the_catalog(self):
        names = set(publication_permissions("terrenos", "terrenos"))
        self.assertEqual(len(PERMISSION_CATALOG), 40)
        self.assertTrue(names <= set(PERMISSION_CATALOG))
        self.assertIn("terrenos", PERMISSION_CATALOG["terrenos.trash.own"])
        self.assertIn("terrenos.delete_permanently", BUILTIN_ROLES["Ingeniero"]["permissions"])

    def test_seed_creates_them_and_only_the_engineer_receives_them(self):
        call_command("seed_access_control", stdout=io.StringIO())
        self.assertEqual(Permiso.objects.filter(nombre__startswith="terrenos.").count(), 8)
        granted = lambda role: set(RolPermiso.objects.filter(  # noqa: E731
            rol__nombre=role, permiso__nombre__startswith="terrenos.").values_list("permiso__nombre", flat=True))
        self.assertEqual(len(granted("Ingeniero")), 8)
        self.assertEqual(granted("Arquitecta"), set())
        self.assertEqual(granted("Empleado"), set())

    def test_the_type_appears_in_the_unified_trash_with_its_permissions(self):
        response = client_with("terrenos.trash.any").get(TRASH, {"type": "terrenos"})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["results"][0]["title"], "Lote 7")
        self.assertEqual(response.json()["results"][0]["type"], "terrenos")
        self.assertEqual(self.repository.owner_ids, [None])

    def test_own_only_users_see_just_their_own_items(self):
        response = client_with("terrenos.trash.own", user_id="5").get(TRASH, {"type": "terrenos"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.repository.owner_ids, [5])

    def test_restore_or_delete_permission_sees_everything(self):
        for permission in ("terrenos.restore", "terrenos.delete_permanently"):
            self.repository.owner_ids.clear()
            self.assertEqual(client_with(permission).get(TRASH, {"type": "terrenos"}).status_code, 200)
            self.assertEqual(self.repository.owner_ids, [None])

    def test_other_types_permissions_do_not_open_it(self):
        response = client_with("properties.trash.any", "projects.trash.any").get(TRASH, {"type": "terrenos"})
        self.assertEqual(response.status_code, 403)

    def test_audit_label_and_query_choices_include_the_new_type(self):
        self.assertEqual(publication_registry.audit_label("terrenos"), "Terrenos")
        self.assertEqual(list(TrashQuerySerializer().fields["type"].choices), ["properties", "projects", "terrenos"])

    def test_removing_the_registration_removes_everything_it_added(self):
        publication_registry.unregister("terrenos")
        self.assertEqual(len(PERMISSION_CATALOG), 32)
        self.assertNotIn("terrenos.create", PERMISSION_CATALOG)
        self.assertEqual(client_with("admin.all").get(TRASH, {"type": "terrenos"}).status_code, 400)
        self.assertIsNone(publication_registry.audit_label("terrenos"))


class UnifiedTrashTypesTests(TestCase):
    def test_only_types_with_trash_are_accepted(self):
        client = client_with("admin.all")
        self.assertEqual(client.get(TRASH, {"type": "properties"}).status_code, 200)
        self.assertEqual(client.get(TRASH, {"type": "projects"}).status_code, 200)
        for bad in ({"type": "news"}, {"type": "otra-cosa"}, {}):
            with self.subTest(query=bad):
                response = client.get(TRASH, bad)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["error"]["code"], "validation_error")

    def test_requires_authentication(self):
        self.assertEqual(APIClient().get(TRASH, {"type": "properties"}).status_code, 401)

    def test_news_factory_has_no_trash_and_no_ownership(self):
        kit = NewsFactory(object()).create_kit()
        self.assertFalse(kit.supports_trash or kit.ownership)
        self.assertEqual(PropertyFactory(object()).create_kit().label, "bienes raíces")
