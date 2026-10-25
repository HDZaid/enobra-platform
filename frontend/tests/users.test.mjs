import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { canAccessAdminSection } from '../src/features/admin/utils/adminData.js';
import { emptyUserDraft, makeUserPayload, previewUserRoles, readManagedUser, readUserRoles,
  canAssignUserRole, userEditDraft, userEditChanges, validateUserEditDraft,
  userFieldErrors, userRequestError, validateUserDraft } from '../src/features/admin/utils/users.js';
import { saveUserChanges, usersService } from '../src/features/admin/services/usersService.js';

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
  assert.equal(userRequestError({ status: 404, message: 'Usuario no encontrado.' }), 'Usuario no encontrado.');
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

const actor = () => ({ id: '1', permissions: ['users.manage', 'properties.create'] });

test('edición envía solo datos modificados y conserva asignaciones sin elegir otro rol', () => {
  const original = user();
  const draft = userEditDraft(original);
  assert.deepEqual(userEditChanges(draft, original), { data: {} });
  assert.deepEqual(userEditChanges({ ...draft, name: ' Nombre editado ', active: false, role_id: '2' }, original),
    { data: { name: 'Nombre editado', active: false }, role_id: 2 });
  const multiple = { ...original, roles: [...original.roles, { id: 2, name: 'Arquitecta' }] };
  assert.deepEqual(userEditChanges(userEditDraft(multiple), multiple), { data: {} });
  assert.equal(userEditChanges({ ...userEditDraft(multiple), role_id: '3' }, multiple).role_id, 3);
  assert.deepEqual(userEditChanges({ ...draft, name: ` ${original.name} ` }, original), { data: {} });
});

test('edición impide autobloqueo, roles inactivos y escalada; permite editar datos con el rol actual inactivo', () => {
  const original = user();
  const draft = userEditDraft(original);
  assert.deepEqual(validateUserEditDraft({ ...draft, name: 'Editado' }, original, [], actor()), {});
  const own = { ...actor(), id: original.id };
  const blocked = validateUserEditDraft({ ...draft, active: false, role_id: '2' }, original, previewUserRoles, own);
  assert.ok(blocked.active); assert.ok(blocked.role_id);
  assert.ok(validateUserEditDraft({ ...draft, role_id: '2' }, original, previewUserRoles, actor()).role_id);
  assert.ok(validateUserEditDraft({ ...draft, role_id: '99' }, original, previewUserRoles, actor()).role_id);
  assert.equal(canAssignUserRole(previewUserRoles[0], actor()), false);
  assert.equal(canAssignUserRole(previewUserRoles[2], actor()), true);
  assert.equal(canAssignUserRole(previewUserRoles[0], { permissions: ['admin.all'] }), true);
  assert.equal(canAssignUserRole({ ...previewUserRoles[0], active: false }, { permissions: ['admin.all'] }), false);
  assert.ok(validateUserEditDraft({ ...draft, name: '  ' }, original, [], actor()).name);
});

test('edición y rol usan PATCH y PUT separados, con payload mínimo y Bearer', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(user());
  };
  const result = await saveUserChanges(user(), { data: { name: 'Editado' }, role_id: 2 }, 'access');
  assert.deepEqual(result.completed, ['data', 'role']);
  assert.equal(result.failed, null);
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method, JSON.parse(options.body)]), [
    ['/api/v1/admin/users/4/', 'PATCH', { name: 'Editado' }],
    ['/api/v1/admin/users/4/role/', 'PUT', { role_id: 2 }],
  ]);
  assert.ok(calls.every(({ options }) => options.headers.Authorization === 'Bearer access'));
});

test('guardado parcial conserva datos confirmados y reintenta solo el rol pendiente', async () => {
  const calls = [];
  let rejectRole = true;
  globalThis.fetch = async (url, options) => {
    calls.push(options.method);
    if (options.method === 'PUT' && rejectRole) return Response.json({ error: {
      message: 'No puedes asignar un rol con permisos que no posees.', code: 'permission_denied',
    } }, { status: 403 });
    return Response.json({ ...user(), name: 'Editado', ...(options.method === 'PUT' ? { roles: [{ id: 2, name: 'Arquitecta' }] } : {}) });
  };
  const desired = { ...userEditDraft(user()), name: 'Editado', role_id: '2' };
  const partial = await saveUserChanges(user(), userEditChanges(desired, user()), 'access');
  assert.equal(partial.user.name, 'Editado');
  assert.deepEqual(partial.completed, ['data']);
  assert.equal(partial.failed.step, 'role');
  assert.match(userRequestError(partial.failed.error), /permisos que no posees/);
  rejectRole = false;
  const retried = await saveUserChanges(partial.user, userEditChanges(desired, partial.user), 'access');
  assert.deepEqual(calls, ['PATCH', 'PUT', 'PUT']);
  assert.equal(retried.failed, null);
  assert.deepEqual(retried.completed, ['role']);
});

test('si falla editar datos, no cambia el rol y mantiene el error de campo del servidor', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(options.method);
    return Response.json({ error: { message: 'Datos inválidos', details: { active: ['Debe conservarse al menos un Ingeniero activo.'] } } }, { status: 400 });
  };
  const original = user();
  const result = await saveUserChanges(original, { data: { active: false }, role_id: 2 }, 'access');
  assert.deepEqual(calls, ['PATCH']);
  assert.equal(result.user, original);
  assert.deepEqual(result.completed, []);
  assert.match(userFieldErrors(result.failed.error).active, /Ingeniero activo/);
});

test('sin cambios no escribe y un fallo de red o respuesta inválida nunca se confirma como éxito', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('Error de red'); };
  assert.equal((await saveUserChanges(user(), { data: {} }, 'access')).failed, null);
  assert.equal(calls, 0);
  assert.equal((await saveUserChanges(user(), { data: { name: 'Editado' } }, 'access')).failed.step, 'data');
  globalThis.fetch = async () => Response.json({ invalid: true });
  assert.equal((await saveUserChanges(user(), { data: {}, role_id: 2 }, 'access')).failed.step, 'role');
});
