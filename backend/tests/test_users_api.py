import io
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from persistence.models import Usuario, UsuarioRol, Rol, HistorialActividad

URL = '/api/v1/admin/users/'


class UserManagementAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_access_control', stdout=io.StringIO())
        cls.role = Rol.objects.get(nombre='Empleado')
        cls.admin = Usuario.objects.create(nombre='Administrador', correo='owner@example.com',
            password_hash=make_password('Owner!Robusto2026'))
        UsuarioRol.objects.create(usuario=cls.admin, rol=Rol.objects.get(nombre='Ingeniero'))

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        result = self.client.post('/api/v1/auth/login/', {
            'email': self.admin.correo, 'password': 'Owner!Robusto2026'}, format='json')
        self.assertEqual(result.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + result.json()['access'])

    def payload(self, **changes):
        data = {'name': 'Cuenta nueva', 'email': 'new@example.com', 'password': 'Seguro!2026@Obra',
                'role_id': self.role.pk, 'active': True}
        data.update(changes)
        return data

    def test_create_hash_role_audit_and_login(self):
        with override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.PBKDF2PasswordHasher']):
            response = self.client.post(URL, self.payload(), format='json')
            self.assertEqual(response.status_code, 201, response.content)
            user = Usuario.objects.get(correo='new@example.com')
            self.assertTrue(check_password(self.payload()['password'], user.password_hash))
            self.assertTrue(user.password_hash.startswith('pbkdf2_sha256$'))
            self.assertEqual(response.json()['roles'][0]['id'], self.role.pk)
            self.assertNotIn('password', response.json())
            self.assertNotIn('password_hash', response.json())
            audit = HistorialActividad.objects.get(modulo='users', id_registro=user.pk)
            self.assertEqual(audit.usuario_id, self.admin.pk)
            self.assertNotIn(self.payload()['password'], audit.descripcion)
            login = APIClient().post('/api/v1/auth/login/', {
                'email': 'new@example.com', 'password': self.payload()['password']}, format='json')
            self.assertEqual(login.status_code, 200)
            self.assertEqual(login.json()['user']['role'], 'Empleado')

    def test_duplicate_email_case_insensitive(self):
        response = self.client.post(URL, self.payload(email='OWNER@EXAMPLE.COM'), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json()['error']['details'])
        self.assertEqual(Usuario.objects.count(), 1)

    def test_missing_and_inactive_role(self):
        for role_id in [99999, self.role.pk]:
            if role_id == self.role.pk:
                Rol.objects.filter(pk=role_id).update(estado=False)
            response = self.client.post(URL, self.payload(role_id=role_id), format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_invalid_fields_and_password_strength(self):
        for change in ({'name': ''}, {'email': 'invalid'}, {'password': '1234567890'},
                       {'password': 'short'}, {'password': 'password123'}, {'name': 'x' * 121},
                       {'password': 'x' * 129}, {'role_id': 0}):
            with self.subTest(change=list(change)):
                self.assertEqual(self.client.post(URL, self.payload(**change), format='json').status_code, 400)
        self.assertEqual(Usuario.objects.count(), 1)

    def test_inactive_account_cannot_login(self):
        self.assertEqual(self.client.post(URL, self.payload(active=False), format='json').status_code, 201)
        result = APIClient().post('/api/v1/auth/login/', {
            'email': 'new@example.com', 'password': self.payload()['password']}, format='json')
        self.assertEqual(result.status_code, 401)

    def test_password_similar_to_name_or_email_returns_field_error_without_creating_user(self):
        cases = [
            {'name': 'Colaborador Prueba', 'password': 'ColaboradorPrueba2026!'},
            {'email': 'colaborador2026@example.com', 'password': 'colaborador2026'},
        ]
        for fields in cases:
            with self.subTest(attribute='name' if 'name' in fields else 'email'):
                response = self.client.post(URL, self.payload(**fields), format='json')
                self.assertEqual(response.status_code, 400, response.content)
                body = response.json()
                self.assertEqual(body['error']['code'], 'validation_error')
                self.assertTrue(body['error']['details']['password'])
                self.assertNotIn(fields['password'], str(body))
        self.assertEqual(Usuario.objects.count(), 1)
        self.assertEqual(UsuarioRol.objects.count(), 1)
        self.assertFalse(HistorialActividad.objects.filter(modulo='users').exists())

    def test_list_pagination_search_and_no_password_exposure(self):
        self.client.post(URL, self.payload(), format='json')
        response = self.client.get(URL + '?q=new@example.com&page_size=1').json()
        self.assertEqual(response['count'], 1)
        self.assertEqual(response['results'][0]['email'], 'new@example.com')
        self.assertNotIn('password', str(response))
        self.assertEqual(self.client.get(URL + '?page_size=101').status_code, 400)

    def test_role_options_only_active_roles(self):
        Rol.objects.filter(pk=self.role.pk).update(estado=False)
        result = self.client.get(URL + 'roles/')
        self.assertEqual(result.status_code, 200)
        self.assertNotIn(self.role.pk, [role['id'] for role in result.json()])

    def test_anonymous_and_limited_roles_cannot_manage_users(self):
        public = APIClient()
        for path in [URL, URL + 'roles/']:
            self.assertEqual(public.get(path).status_code, 401)
        self.assertEqual(public.post(URL, self.payload(), format='json').status_code, 401)
        from apps.accounts.interfaces import Principal
        for role, permissions in [('Arquitecta', {'properties.publish'}), ('Empleado', {'properties.create'})]:
            public.force_authenticate(Principal(id='1', name=role, email='viewer@example.com',
                role=role, permissions=frozenset(permissions)))
            self.assertEqual(public.get(URL).status_code, 403)
            self.assertEqual(public.get(URL + 'roles/').status_code, 403)
            self.assertEqual(public.post(URL, self.payload(), format='json').status_code, 403)

    def test_users_read_and_manage_can_list_but_only_admin_all_can_create(self):
        # BE-02: GET /admin/users/ acepta users.read o users.manage; crear cuentas sigue exigiendo admin.all.
        from apps.accounts.interfaces import Principal
        client = APIClient()
        for role, permissions in [('Lector', {'users.read'}), ('Gestor', {'users.manage'})]:
            client.force_authenticate(Principal(id='1', name=role, email='viewer@example.com',
                role=role, permissions=frozenset(permissions)))
            self.assertEqual(client.get(URL).status_code, 200)
            self.assertEqual(client.get(URL + 'roles/').status_code, 200)
            self.assertEqual(client.post(URL, self.payload(), format='json').status_code, 403)

    def test_account_and_role_rollback_if_audit_fails(self):
        with patch('persistence.users.HistorialActividad.objects.create', side_effect=RuntimeError('audit unavailable')):
            with self.assertRaises(RuntimeError):
                self.client.post(URL, self.payload(), format='json')
        self.assertFalse(Usuario.objects.filter(correo='new@example.com').exists())
        self.assertEqual(UsuarioRol.objects.count(), 1)


    def make_user(self, email, role, active=True):
        user = Usuario.objects.create(nombre='Colaborador', correo=email,
            password_hash=make_password('Owner!Robusto2026'),
            estado='ACTIVO' if active else 'INACTIVO')
        UsuarioRol.objects.create(usuario=user, rol=role)
        return user

    def client_for(self, user):
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': user.correo, 'password': 'Owner!Robusto2026'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.json()['access'])
        return client

    def assert_error(self, response, status, field=None):
        self.assertEqual(response.status_code, status, response.content)
        expected = {400: 'validation_error', 401: 'not_authenticated',
                    403: 'permission_denied', 404: 'not_found'}
        self.assertEqual(response.json()['error']['code'], expected[status])
        if field:
            self.assertIn(field, response.json()['error']['details'])

    def test_patch_name_state_and_audit(self):
        user = self.make_user('edit@example.com', self.role)
        response = self.client.patch(URL + f'{user.pk}/', {'name': 'Nombre editado', 'active': False}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['name'], 'Nombre editado')
        self.assertFalse(response.json()['active'])
        self.assertNotIn('password_hash', response.json())
        user.refresh_from_db()
        self.assertEqual(user.estado, 'INACTIVO')
        self.assertIsNotNone(user.fecha_actualizacion)
        audit = HistorialActividad.objects.get(modulo='users', accion='EDITAR', id_registro=user.pk)
        self.assertEqual(audit.usuario_id, self.admin.pk)
        self.assertIn('Colaborador', audit.descripcion)
        self.assertIn('Nombre editado', audit.descripcion)
        self.assertIn('ACTIVO', audit.descripcion)
        self.assertEqual(UsuarioRol.objects.get(usuario=user).rol_id, self.role.pk)
        self.assertEqual(self.client.patch(URL + f'{user.pk}/', {'active': True}, format='json').status_code, 200)

    def test_role_replaces_all_previous_roles_and_audits_names(self):
        user = self.make_user('roles@example.com', self.role)
        architect = Rol.objects.get(nombre='Arquitecta')
        UsuarioRol.objects.create(usuario=user, rol=architect)
        engineer = Rol.objects.get(nombre='Ingeniero')
        response = self.client.put(URL + f'{user.pk}/role/', {'role_id': engineer.pk}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([r['id'] for r in response.json()['roles']], [engineer.pk])
        self.assertEqual(list(user.roles.values_list('pk', flat=True)), [engineer.pk])
        audit = HistorialActividad.objects.get(modulo='users', accion='ROL', id_registro=user.pk)
        self.assertEqual(audit.usuario_id, self.admin.pk)
        for name in ('Empleado', 'Arquitecta', 'Ingeniero'):
            self.assertIn(name, audit.descripcion)
        # La autenticaci?n lee el nuevo rol de la base.
        login = self.client_for(user)
        self.assertEqual(login.get('/api/v1/auth/me/').json()['role'], 'Ingeniero')

    def test_self_role_and_deactivation_are_forbidden_but_name_is_allowed(self):
        self.assert_error(self.client.patch(URL + f'{self.admin.pk}/', {'active': False}, format='json'), 403)
        self.assert_error(self.client.put(URL + f'{self.admin.pk}/role/', {'role_id': self.role.pk}, format='json'), 403)
        self.assertEqual(self.client.patch(URL + f'{self.admin.pk}/', {'name': 'Mi nombre'}, format='json').status_code, 200)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.estado, 'ACTIVO')
        self.assertEqual(self.admin.roles.get().nombre, 'Ingeniero')

    def test_last_active_engineer_cannot_be_disabled_or_demoted(self):
        from persistence.models import Permiso, RolPermiso
        manager_role = Rol.objects.create(nombre='Administrador de respaldo')
        RolPermiso.objects.create(rol=manager_role, permiso=Permiso.objects.get(nombre='admin.all'))
        manager = self.make_user('backup@example.com', manager_role)
        client = self.client_for(manager)
        self.make_user('inactive-engineer@example.com', Rol.objects.get(nombre='Ingeniero'), active=False)
        self.assert_error(client.patch(URL + f'{self.admin.pk}/', {'active': False}, format='json'), 400, 'active')
        self.assert_error(client.put(URL + f'{self.admin.pk}/role/', {'role_id': self.role.pk}, format='json'), 400, 'role_id')
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.estado, 'ACTIVO')
        self.assertEqual(self.admin.roles.get().nombre, 'Ingeniero')
        self.assertFalse(HistorialActividad.objects.filter(modulo='users').exists())

    def test_two_engineers_allow_one_deactivation_then_protect_the_other(self):
        engineer = Rol.objects.get(nombre='Ingeniero')
        other = self.make_user('second-engineer@example.com', engineer)
        other_client = self.client_for(other)
        self.assertEqual(self.client.patch(URL + f'{other.pk}/', {'active': False}, format='json').status_code, 200)
        self.assert_error(other_client.patch(URL + f'{self.admin.pk}/', {'active': False}, format='json'), 401)
        other.refresh_from_db()
        self.assertEqual(other.estado, 'INACTIVO')

    def test_two_engineers_allow_one_role_replacement(self):
        other = self.make_user('second-engineer@example.com', Rol.objects.get(nombre='Ingeniero'))
        response = self.client.put(URL + f'{other.pk}/role/', {'role_id': self.role.pk}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(other.roles.get(), self.role)
        self.assertEqual(self.admin.roles.get().nombre, 'Ingeniero')

    def test_users_manage_can_edit_and_assign_subset_but_cannot_escalate(self):
        from persistence.models import Permiso, RolPermiso
        manager_role = Rol.objects.create(nombre='Gestor limitado')
        for permission in Permiso.objects.filter(nombre__in=['users.manage', *self.role.permisos.values_list('nombre', flat=True)]):
            RolPermiso.objects.create(rol=manager_role, permiso=permission)
        manager = self.make_user('manager@example.com', manager_role)
        client = self.client_for(manager)
        user = self.make_user('target@example.com', self.role)
        self.assertEqual(client.patch(URL + f'{user.pk}/', {'name': 'Editado por gestor'}, format='json').status_code, 200)
        self.assertEqual(client.put(URL + f'{user.pk}/role/', {'role_id': self.role.pk}, format='json').status_code, 200)
        before = HistorialActividad.objects.count()
        for role in (Rol.objects.get(nombre='Ingeniero'), Rol.objects.get(nombre='Arquitecta')):
            self.assert_error(client.put(URL + f'{user.pk}/role/', {'role_id': role.pk}, format='json'), 403)
        self.assertEqual(user.roles.get(), self.role)
        self.assertEqual(HistorialActividad.objects.count(), before)

    def test_role_requires_active_existing_destination(self):
        user = self.make_user('target@example.com', self.role)
        inactive = Rol.objects.create(nombre='Inactivo', estado=False)
        for role_id in (999999, inactive.pk):
            self.assert_error(self.client.put(URL + f'{user.pk}/role/', {'role_id': role_id}, format='json'), 400, 'role_id')
        self.assertEqual(user.roles.get(), self.role)
        self.assertFalse(HistorialActividad.objects.filter(modulo='users').exists())

    def test_user_updates_validate_fields_and_missing_users(self):
        user = self.make_user('target@example.com', self.role)
        for data, field in (({'name': ''}, 'name'), ({'name': 'x' * 121}, 'name'), ({'active': 'perhaps'}, 'active')):
            self.assert_error(self.client.patch(URL + f'{user.pk}/', data, format='json'), 400, field)
        self.assert_error(self.client.patch(URL + f'{user.pk}/', {}, format='json'), 400)
        for data in ({}, {'role_id': 0}, {'role_id': 'invalid'}):
            self.assert_error(self.client.put(URL + f'{user.pk}/role/', data, format='json'), 400, 'role_id')
        self.assert_error(self.client.patch(URL + '999999/', {'name': 'Nada'}, format='json'), 404)
        self.assert_error(self.client.put(URL + '999999/role/', {'role_id': self.role.pk}, format='json'), 404)

    def test_updates_require_authentication_and_users_manage(self):
        user = self.make_user('target@example.com', self.role)
        employee = self.client_for(user)
        for client, status in ((APIClient(), 401), (employee, 403)):
            self.assert_error(client.patch(URL + f'{self.admin.pk}/', {'name': 'No'}, format='json'), status)
            self.assert_error(client.put(URL + f'{self.admin.pk}/role/', {'role_id': self.role.pk}, format='json'), status)

    def test_update_and_role_replacement_roll_back_when_audit_fails(self):
        user = self.make_user('rollback@example.com', self.role)
        for method, path, data in (
            ('patch', f'{user.pk}/', {'name': 'No guardar', 'active': False}),
            ('put', f'{user.pk}/role/', {'role_id': Rol.objects.get(nombre='Arquitecta').pk}),
        ):
            with self.subTest(method=method):
                with patch('persistence.users.HistorialActividad.objects.create', side_effect=RuntimeError('audit unavailable')):
                    with self.assertRaises(RuntimeError):
                        getattr(self.client, method)(URL + path, data, format='json')
                user.refresh_from_db()
                self.assertEqual(user.nombre, 'Colaborador')
                self.assertEqual(user.estado, 'ACTIVO')
                self.assertIsNone(user.fecha_actualizacion)
                self.assertEqual(user.roles.get(), self.role)
                self.assertFalse(HistorialActividad.objects.filter(modulo='users').exists())
