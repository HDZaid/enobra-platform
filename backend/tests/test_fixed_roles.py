"""Política fija con ORM/HTTP aislados. No usa la conexión ni datos reales."""
from django.test import TestCase
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from rest_framework.test import APIClient
from persistence.models import Rol, Permiso, RolPermiso, Usuario, UsuarioRol
from persistence.accounts import DjangoAuthService
from persistence.access_control import DjangoAccessControlRepository
from rest_framework.exceptions import PermissionDenied
from tests import test_admin_api as fixtures

API = '/api/v1/'
PASSWORD = 'Seguro!2026@EnObra'

class FixedRolesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.users = {}
        for name in ('Ingeniero', 'Arquitecta', 'Empleado'):
            role = Rol.objects.create(nombre=name)
            user = Usuario.objects.create(nombre=name, correo=name.lower()+'@example.test', password_hash=make_password(PASSWORD))
            UsuarioRol.objects.create(usuario=user, rol=role)
            self.users[name] = user
        # Permisos persistidos adversariales: la política humana debe ignorarlos.
        dangerous = Permiso.objects.create(nombre='admin.all')
        for name in ('Arquitecta', 'Empleado'):
            RolPermiso.objects.create(rol=self.users[name].roles.get(), permiso=dangerous)

    def login(self, role):
        client = APIClient()
        response = client.post(API+'auth/login/', {'email': self.users[role].correo, 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        client.credentials(HTTP_AUTHORIZATION='Bearer '+response.json()['access'])
        return client, response.json()['user']

    def test_effective_permissions_override_stored_permissions_without_changing_roles(self):
        before = list(Rol.objects.values_list('id', 'nombre', 'estado'))
        links = list(RolPermiso.objects.values_list('rol_id', 'permiso_id'))
        expected = {'Ingeniero': 'Administrador', 'Arquitecta': 'Arquitecto', 'Empleado': 'Empleado'}
        for name, label in expected.items():
            client, user = self.login(name)
            self.assertEqual(user['role'], label)
            self.assertEqual(client.get(API+'auth/me/').json()['role'], label)
            if name != 'Ingeniero': self.assertNotIn('admin.all', user['permissions'])
            if name == 'Empleado':
                self.assertIn('projects.edit.any', user['permissions'])
                self.assertFalse(any('trash' in p or 'delete' in p or p.startswith(('roles.', 'users.')) for p in user['permissions']))
        self.assertEqual(before, list(Rol.objects.values_list('id', 'nombre', 'estado')))
        self.assertEqual(links, list(RolPermiso.objects.values_list('rol_id', 'permiso_id')))

    def test_fixed_options_preserve_ids_and_missing_roles_are_not_created(self):
        client, _ = self.login('Ingeniero')
        options = client.get(API+'admin/users/roles/').json()
        self.assertEqual({r['name'] for r in options}, {'Administrador', 'Empleado', 'Arquitecto'})
        self.assertEqual({r['id'] for r in options}, set(Rol.objects.values_list('id', flat=True)))
        Rol.objects.filter(nombre='Arquitecta').update(estado=False)
        self.assertEqual(len(client.get(API+'admin/users/roles/').json()), 2)
        self.assertEqual(Rol.objects.count(), 3)

    def test_every_role_cannot_mutate_roles_even_admin(self):
        before = Rol.objects.count()
        for name in self.users:
            client, _ = self.login(name)
            for path in ('admin/roles/', 'admin/roles/1/', 'admin/permissions/'):
                for method in ('post', 'put', 'patch', 'delete'):
                    self.assertEqual(getattr(client, method)(API+path, {'name':'Nuevo'}, format='json').status_code, 404)
        with self.assertRaises(PermissionDenied): DjangoAccessControlRepository().create_role({'name':'Nuevo'}, actor_id=self.users['Ingeniero'].pk)
        self.assertEqual(Rol.objects.count(), before)

    def test_employee_edits_and_publishes_others_but_has_no_deletion(self):
        admin, _ = self.login('Ingeniero')
        employee, _ = self.login('Empleado')
        for kind in ('projects', 'properties', 'news'):
            created = admin.post(API+kind+'/', fixtures.AdminAPITests.payload(None, kind), format='json')
            self.assertEqual(created.status_code, 201, created.content)
            key = created.json()['id']
            self.assertEqual(employee.patch(API+f'{kind}/{key}/', {'title':'Edición ajena', 'published':True}, format='json').status_code, 200)
            self.assertEqual(employee.delete(API+f'{kind}/{key}/').status_code, 403)
        self.assertEqual(employee.get(API+'admin/users/').status_code, 403)
        self.assertEqual(employee.post(API+'admin/projects/x/restore/').status_code, 403)

    def test_architect_trash_restore_but_no_permanent_delete_create_users_or_assign_roles(self):
        admin, _ = self.login('Ingeniero'); architect, _ = self.login('Arquitecta')
        created = admin.post(API+'projects/', fixtures.AdminAPITests.payload(None, 'projects'), format='json').json()
        key = created['id']
        self.assertEqual(architect.delete(API+f'projects/{key}/').status_code, 204)
        self.assertEqual(architect.delete(API+f'admin/projects/{key}/permanent/').status_code, 403)
        self.assertEqual(architect.post(API+f'admin/projects/{key}/restore/').status_code, 204)
        self.assertEqual(architect.post(API+'admin/users/', {}, format='json').status_code, 403)
        for target in ('Ingeniero','Arquitecta','Empleado'):
            self.assertEqual(architect.put(API+f'admin/users/{self.users[target].pk}/role/', {'role_id':self.users['Ingeniero'].roles.get().pk}, format='json').status_code, 403)
        self.assertEqual(architect.patch(API+f'admin/users/{self.users["Ingeniero"].pk}/', {'name':'Ataque'}, format='json').status_code, 403)
        self.assertEqual(admin.delete(API+f'projects/{key}/').status_code, 204)
        self.assertEqual(admin.delete(API+f'admin/projects/{key}/permanent/').status_code, 204)

    def test_noninteractive_cleanup_keeps_only_its_stored_permissions(self):
        role = Rol.objects.create(nombre='Cuenta técnica de limpieza')
        user = Usuario.objects.create(nombre='Servicio', correo='service@example.test', password_hash=make_password(None))
        UsuarioRol.objects.create(usuario=user, rol=role)
        wanted = {'projects.delete_permanently', 'properties.delete_permanently'}
        for name in wanted:
            permission = Permiso.objects.create(nombre=name)
            RolPermiso.objects.create(rol=role, permiso=permission)
        auth = DjangoAuthService()
        self.assertIsNone(auth._principal(user.pk))
        self.assertEqual(auth._principal(user.pk, allow_service=True).permissions, wanted)
        self.assertIsNone(auth.login(user.correo, 'anything'))
