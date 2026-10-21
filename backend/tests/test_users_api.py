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
        for role, permissions in [('Arquitecta', {'properties.publish'}), ('Empleado', {'properties.create'}),
                                  ('Gestor', {'users.manage'})]:
            public.force_authenticate(Principal(id='1', name=role, email='viewer@example.com',
                role=role, permissions=frozenset(permissions)))
            self.assertEqual(public.get(URL).status_code, 403)
            self.assertEqual(public.get(URL + 'roles/').status_code, 403)
            self.assertEqual(public.post(URL, self.payload(), format='json').status_code, 403)

    def test_account_and_role_rollback_if_audit_fails(self):
        with patch('persistence.users.HistorialActividad.objects.create', side_effect=RuntimeError('audit unavailable')):
            with self.assertRaises(RuntimeError):
                self.client.post(URL, self.payload(), format='json')
        self.assertFalse(Usuario.objects.filter(correo='new@example.com').exists())
        self.assertEqual(UsuarioRol.objects.count(), 1)
