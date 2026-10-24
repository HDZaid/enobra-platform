import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { canAccessAdminSection } from '../src/features/admin/utils/adminData.js';
import { emptyUserDraft, makeUserPayload, previewUserRoles, readManagedUser, readUserRoles,
  userFieldErrors, userRequestError, validateUserDraft } from '../src/features/admin/utils/users.js';
import { usersService } from '../src/features/admin/services/usersService.js';

const fetchOriginal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchOriginal; });
const valid = () => ({ ...emptyUserDraft(), name: ' Cuenta nueva ', email: ' USER@EXAMPLE.COM ',
  password: 'Clave!Privada2026', confirmation: 'Clave!Privada2026', role_id: '3' });
const user = () => ({ id: '4', name: 'Cuenta nueva', email: 'user@example.com', active: true,
  roles: [{ id: 3, name: 'Empleado', permissions: ['properties.create'] }], created_at: '2026-10-21T12:00:00Z' });

test('Usuarios se habilita con lectura, gestión o acceso completo según FE-06', () => {
  for (const permission of ['admin.all', 'users.manage', 'users.read']) {
    assert.equal(canAccessAdminSection({ permissions: [permission] }, 'users'), true);
  }
  for (const account of [null, { role: 'Ingeniero', permissions: [] },
    { role: 'Arquitecta', permissions: ['properties.publish'] }]) {
    assert.equal(canAccessAdminSection(account, 'users'), false);
  }
});

test('valida nombre, correo, rol y confirmación antes de enviar', () => {
  assert.deepEqual(validateUserDraft(valid(), previewUserRoles), {});
  const errors = validateUserDraft(emptyUserDraft(), previewUserRoles);
  for (const field of ['name', 'email', 'password', 'role_id']) assert.ok(errors[field]);
  assert.ok(validateUserDraft({ ...valid(), confirmation: 'otra' }, previewUserRoles).confirmation);
  assert.ok(validateUserDraft({ ...valid(), role_id: '99' }, previewUserRoles).role_id);
  assert.ok(validateUserDraft(valid(), []).role_id);
});

test('rechaza contraseña numérica, corta o demasiado larga', () => {
  for (const password of ['1234567890', 'corta', 'x'.repeat(129)]) {
    assert.ok(validateUserDraft({ ...valid(), password }, previewUserRoles).password);
  }
});

test('envía solo el contrato sin confirmación ni datos de sesión', () => {
  assert.deepEqual(makeUserPayload({ ...valid(), token: 'secret' }), {
    name: 'Cuenta nueva', email: 'user@example.com', password: 'Clave!Privada2026', role_id: 3, active: true,
  });
});

test('lee cuentas y elimina campos privados de una respuesta', () => {
  const result = readManagedUser({ ...user(), password_hash: 'nunca conservar', password: 'secreto' });
  assert.equal(result.id, '4');
  assert.deepEqual(result.roles, [{ id: 3, name: 'Empleado' }]);
  assert.equal(result.password_hash, undefined);
  assert.equal(result.password, undefined);
  assert.throws(() => readManagedUser({ ...user(), active: 'true' }), TypeError);
  assert.throws(() => readManagedUser({ ...user(), created_at: 'invalid' }), TypeError);
  assert.throws(() => readManagedUser(null), TypeError);
});

test('lee solo roles activos y rechaza respuestas incompatibles', () => {
  assert.equal(readUserRoles([...previewUserRoles, { ...previewUserRoles[0], active: false }]).length, 3);
  assert.throws(() => readUserRoles({ results: [] }), TypeError);
  assert.throws(() => readUserRoles([{ id: 'abc' }]), TypeError);
});

test('muestra errores por campo y distingue autorización y contrato pendiente', () => {
  assert.deepEqual(userFieldErrors({ status: 400, details: { email: ['Ya existe.'], unknown: 'x' } }), { email: 'Ya existe.' });
  assert.deepEqual(userFieldErrors({ status: 500, details: { email: 'error' } }), {});
  assert.match(userRequestError({ status: 401 }), /sesión/);
  assert.match(userRequestError({ status: 403 }), /autorización/);
  assert.match(userRequestError({ status: 404 }), /no está disponible/);
});

test('listado, roles y creación usan las rutas reales y Bearer', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(options.method === 'POST' ? user() : []), {
      status: options.method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' },
    });
  };
  await usersService.list({ q: ' Cuenta nueva ', page: 2 }, 'access');
  await usersService.roles('access');
  await usersService.create(makeUserPayload(valid()), 'access');
  assert.equal(calls[0].url, '/api/v1/admin/users/?page=2&page_size=12&q=Cuenta+nueva');
  assert.equal(calls[1].url, '/api/v1/admin/users/roles/');
  assert.equal(calls[2].url, '/api/v1/admin/users/');
  for (const call of calls) assert.equal(call.options.headers.Authorization, 'Bearer access');
  assert.equal(JSON.parse(calls[2].options.body).confirmation, undefined);
});
