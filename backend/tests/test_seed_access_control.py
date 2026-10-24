"""BE-03: el seed no pisa lo que el Ingeniero configuró desde la interfaz (DEC-02)."""
import io

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.accounts.access_policy import BUILTIN_ROLES, PERMISSION_CATALOG
from persistence.models import Permiso, Rol, RolPermiso, Usuario
from tests.test_rbac_catalog import ORIGINAL_PERMISSIONS


def seed(*flags):
    output = io.StringIO()
    call_command("seed_access_control", *flags, stdout=output)
    return output.getvalue()


def granted(role_name):
    return set(RolPermiso.objects.filter(rol__nombre=role_name).values_list("permiso__nombre", flat=True))


def grant(role_name, *names):
    role = Rol.objects.get(nombre=role_name)
    for name in names:
        RolPermiso.objects.get_or_create(rol=role, permiso=Permiso.objects.get(nombre=name))


def revoke(role_name, *names):
    RolPermiso.objects.filter(rol__nombre=role_name, permiso__nombre__in=names).delete()


class SeedAccessControlTests(TestCase):
    def test_first_run_creates_catalog_and_builtin_roles_without_users(self):
        output = seed()
        self.assertIn("Modo default", output)
        self.assertEqual(set(Permiso.objects.values_list("nombre", flat=True)), set(PERMISSION_CATALOG))
        for name, specification in BUILTIN_ROLES.items():
            with self.subTest(role=name):
                self.assertEqual(granted(name), set(specification["permissions"]))
                self.assertTrue(Rol.objects.get(nombre=name).estado)
        self.assertEqual(Usuario.objects.count(), 0)

    def test_running_twice_changes_nothing(self):
        seed()
        snapshot = (Permiso.objects.count(), Rol.objects.count(), RolPermiso.objects.count())
        for flags in ((), ("--add-missing",), ("--sync",)):
            seed(*flags)
            self.assertEqual((Permiso.objects.count(), Rol.objects.count(), RolPermiso.objects.count()), snapshot)

    def test_default_keeps_roles_edited_by_hand(self):
        seed()
        revoke("Arquitecta", "properties.publish")           # quitó un permiso
        grant("Empleado", "news.create")                      # agregó uno
        Rol.objects.filter(nombre="Empleado").update(descripcion="Personalizado", estado=False)
        architect, employee = granted("Arquitecta"), granted("Empleado")
        seed()
        self.assertEqual(granted("Arquitecta"), architect)
        self.assertNotIn("properties.publish", granted("Arquitecta"))
        self.assertEqual(granted("Empleado"), employee)
        edited = Rol.objects.get(nombre="Empleado")
        self.assertEqual((edited.descripcion, edited.estado), ("Personalizado", False))

    def test_default_always_restores_the_engineer_to_all_permissions_and_active(self):
        seed()
        revoke("Ingeniero", "admin.all", "audit.export", "company.edit")
        Rol.objects.filter(nombre="Ingeniero").update(estado=False)
        seed()
        self.assertEqual(granted("Ingeniero"), set(PERMISSION_CATALOG))
        self.assertTrue(Rol.objects.get(nombre="Ingeniero").estado)

    def test_default_on_an_older_database_adds_new_permissions_but_not_to_edited_roles(self):
        """Base previa al plan: 12 permisos. Los 20 nuevos se crean y solo el Ingeniero los recibe."""
        seed()
        Permiso.objects.exclude(nombre__in=ORIGINAL_PERMISSIONS).delete()
        self.assertEqual(Permiso.objects.count(), 12)
        seed()
        self.assertEqual(Permiso.objects.count(), 32)
        self.assertEqual(granted("Ingeniero"), set(PERMISSION_CATALOG))
        self.assertNotIn("media.upload", granted("Arquitecta"))
        self.assertNotIn("media.upload", granted("Empleado"))

    def test_add_missing_gives_builtin_roles_their_missing_permissions_and_removes_nothing(self):
        seed()
        revoke("Arquitecta", "media.upload")
        revoke("Empleado", "media.upload", "properties.trash.own")
        grant("Empleado", "news.create")                      # extra agregado a mano: se conserva
        seed("--add-missing")
        self.assertEqual(granted("Arquitecta"), set(BUILTIN_ROLES["Arquitecta"]["permissions"]))
        self.assertEqual(granted("Empleado"), set(BUILTIN_ROLES["Empleado"]["permissions"]) | {"news.create"})

    def test_sync_reconciles_builtin_roles_exactly(self):
        seed()
        grant("Empleado", "news.create", "users.manage")
        revoke("Arquitecta", "properties.publish")
        Rol.objects.filter(nombre="Empleado").update(descripcion="Personalizado", estado=False)
        output = seed("--sync")
        self.assertIn("Modo sync", output)
        for name, specification in BUILTIN_ROLES.items():
            with self.subTest(role=name):
                self.assertEqual(granted(name), set(specification["permissions"]))
        restored = Rol.objects.get(nombre="Empleado")
        self.assertEqual((restored.descripcion, restored.estado), (BUILTIN_ROLES["Empleado"]["description"], True))

    def test_custom_roles_are_never_touched(self):
        seed()
        custom = Rol.objects.create(nombre="Contratista", descripcion="Rol propio", estado=False)
        RolPermiso.objects.create(rol=custom, permiso=Permiso.objects.get(nombre="news.create"))
        for flags in ((), ("--add-missing",), ("--sync",)):
            seed(*flags)
            custom.refresh_from_db()
            self.assertEqual((custom.descripcion, custom.estado), ("Rol propio", False), flags)
            self.assertEqual(granted("Contratista"), {"news.create"}, flags)

    def test_permissions_outside_the_catalog_are_never_deleted(self):
        seed()
        Permiso.objects.create(nombre="legacy.permiso", descripcion="Antiguo")
        for flags in ((), ("--add-missing",), ("--sync",)):
            seed(*flags)
            self.assertTrue(Permiso.objects.filter(nombre="legacy.permiso").exists(), flags)

    def test_modes_are_mutually_exclusive(self):
        with self.assertRaises(CommandError):
            seed("--add-missing", "--sync")

    def test_existing_users_keep_their_role_assignments(self):
        from django.contrib.auth.hashers import make_password
        from persistence.models import UsuarioRol
        seed()
        user = Usuario.objects.create(nombre="Ana", correo="ana@example.com", password_hash=make_password("x"))
        UsuarioRol.objects.create(usuario=user, rol=Rol.objects.get(nombre="Empleado"))
        for flags in ((), ("--add-missing",), ("--sync",)):
            seed(*flags)
            self.assertEqual(list(user.roles.values_list("nombre", flat=True)), ["Empleado"], flags)
        self.assertEqual(Usuario.objects.count(), 1)
