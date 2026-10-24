"""BE-01: catálogo de 32 permisos y roles base. Los nombres son contrato público."""
import io

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from apps.accounts.access_policy import BUILTIN_ROLES, PERMISSION_CATALOG
from apps.common.rbac import PLATFORM_PERMISSIONS, publication_permissions
from persistence.models import Permiso

# Los 12 permisos que existían antes del plan: NO se renombran (PLAN-MAESTRO §6.1).
ORIGINAL_PERMISSIONS = (
    "admin.all", "users.manage", "roles.manage", "audit.read",
    "properties.create", "properties.edit.any", "properties.edit.own", "properties.publish",
    "properties.trash.any", "properties.trash.own", "properties.restore",
    "properties.delete_permanently",
)

# Los 32 nombres congelados en el H0 (PLAN-MAESTRO §6.1).
FROZEN_PERMISSIONS = frozenset(ORIGINAL_PERMISSIONS) | {
    "projects.create", "projects.edit.any", "projects.edit.own", "projects.publish",
    "projects.trash.any", "projects.trash.own", "projects.restore", "projects.delete_permanently",
    "news.create", "news.edit", "news.publish", "news.delete",
    "inquiries.read", "inquiries.manage",
    "media.upload", "media.delete",
    "company.edit",
    "users.read", "roles.read", "audit.export",
}


class PermissionCatalogTests(SimpleTestCase):
    def test_catalog_has_the_32_frozen_permissions(self):
        self.assertEqual(len(PERMISSION_CATALOG), 32)
        self.assertEqual(set(PERMISSION_CATALOG), FROZEN_PERMISSIONS)

    def test_original_permissions_keep_their_names(self):
        missing = [name for name in ORIGINAL_PERMISSIONS if name not in PERMISSION_CATALOG]
        self.assertEqual(missing, [], "Se renombró o eliminó un permiso existente; rompe tokens, roles y frontend.")

    def test_every_permission_has_a_spanish_description(self):
        for name, description in PERMISSION_CATALOG.items():
            with self.subTest(permission=name):
                self.assertIsInstance(description, str)
                self.assertGreater(len(description.split()), 2)
                self.assertTrue(description[0].isupper() and description.endswith("."))
                self.assertLessEqual(len(description), 255)

    def test_catalog_is_built_from_the_generator_without_repeated_literals(self):
        for key, label in (("properties", "bienes raíces"), ("projects", "proyectos")):
            generated = publication_permissions(key, label)
            self.assertEqual(len(generated), 8)
            self.assertTrue(set(generated) <= set(PERMISSION_CATALOG))
            for name, description in generated.items():
                self.assertEqual(PERMISSION_CATALOG[name], description)
        self.assertTrue(set(PLATFORM_PERMISSIONS) <= set(PERMISSION_CATALOG))
        self.assertEqual(len(PLATFORM_PERMISSIONS) + 16, 32)

    def test_publication_permissions_with_ownership(self):
        self.assertEqual(list(publication_permissions("terrenos", "terrenos")), [
            "terrenos.create", "terrenos.edit.any", "terrenos.edit.own", "terrenos.publish",
            "terrenos.trash.any", "terrenos.trash.own", "terrenos.restore",
            "terrenos.delete_permanently",
        ])

    def test_publication_permissions_without_ownership(self):
        self.assertEqual(list(publication_permissions("terrenos", "terrenos", ownership=False)), [
            "terrenos.create", "terrenos.edit", "terrenos.publish", "terrenos.trash",
            "terrenos.restore", "terrenos.delete_permanently",
        ])

    def test_labels_appear_in_descriptions(self):
        for description in publication_permissions("projects", "proyectos").values():
            self.assertIn("proyectos", description)


class BuiltinRolesTests(SimpleTestCase):
    def test_roles_only_reference_catalog_permissions(self):
        for role, specification in BUILTIN_ROLES.items():
            with self.subTest(role=role):
                self.assertFalse(set(specification["permissions"]) - set(PERMISSION_CATALOG))
                self.assertEqual(len(specification["permissions"]), len(set(specification["permissions"])))

    def test_engineer_has_all_32(self):
        self.assertEqual(set(BUILTIN_ROLES["Ingeniero"]["permissions"]), FROZEN_PERMISSIONS)

    def test_architect_keeps_five_and_gets_media_upload(self):
        self.assertEqual(set(BUILTIN_ROLES["Arquitecta"]["permissions"]), {
            "properties.create", "properties.edit.any", "properties.publish",
            "properties.trash.any", "properties.restore", "media.upload",
        })

    def test_employee_keeps_three_and_gets_media_upload(self):
        self.assertEqual(set(BUILTIN_ROLES["Empleado"]["permissions"]), {
            "properties.create", "properties.edit.own", "properties.trash.own", "media.upload",
        })

    def test_only_the_engineer_gets_projects_inquiries_users_or_roles(self):
        # DEC-08: Arquitecta y Empleado no reciben Proyectos ni Mensajes por ahora.
        restricted = {name for name in FROZEN_PERMISSIONS
                      if name.split(".")[0] in {"projects", "inquiries", "users", "roles", "audit", "company", "news"}
                      or name in {"admin.all", "media.delete"}}
        for role in ("Arquitecta", "Empleado"):
            with self.subTest(role=role):
                self.assertFalse(restricted & set(BUILTIN_ROLES[role]["permissions"]))


class SeedLoadsCatalogTests(TestCase):
    def test_seed_stores_the_32_permissions_and_engineer_gets_them_all(self):
        call_command("seed_access_control", stdout=io.StringIO())
        self.assertEqual(set(Permiso.objects.values_list("nombre", flat=True)), FROZEN_PERMISSIONS)
        engineer = Permiso.objects.filter(roles__nombre="Ingeniero").values_list("nombre", flat=True)
        self.assertEqual(set(engineer), FROZEN_PERMISSIONS)
