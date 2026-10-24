import assert from 'node:assert/strict';
import test from 'node:test';
import { rolesService } from '../src/features/admin-roles/services/rolesService.js';
import {
  groupPermissions, isOwnRole, makeRolePayload, readPermissions, readRole, readRoles,
  roleDraft, roleFieldErrors, roleHasChanges, roleRequestError, setPermissionGroup,
} from '../src/features/admin-roles/utils/roles.js';

const role = () => ({ id: 3, name: 'Empleado', description: 'Borradores propios', active: true,
  permissions: ['properties.create', 'properties.edit.own', 'properties.trash.own'] });

test('agrupa el catálogo por módulo sin perder permisos ni descripciones', () => {
  const catalog = readPermissions([
    { name: 'admin.all', description: 'Acceso completo' },
    { name: 'properties.create', description: 'Crear propiedades' },
    { name: 'projects.edit.any', description: 'Editar proyectos' },
    { name: 'properties.edit.own', description: 'Editar borradores propios' },
    { name: 'audit.read', description: 'Consultar historial' },
    { name: 'terrenos.create', description: null },
  ]);
  const groups = groupPermissions(catalog);
  assert.deepEqual(groups.map((group) => group.label), ['Bienes Raíces', 'Proyectos', 'Historial', 'Acceso total', 'terrenos']);
  assert.deepEqual(groups[0].items.map((item) => item.description), ['Crear propiedades', 'Editar borradores propios']);
  assert.equal(groups.flatMap((group) => group.items).length, catalog.length);
  assert.deepEqual(groupPermissions([]), []);
});

test('cada uno de los diez módulos tiene su grupo con etiqueta legible', () => {
  const keys = ['properties', 'projects', 'news', 'inquiries', 'media', 'company', 'users', 'roles', 'audit', 'admin'];
  assert.deepEqual(groupPermissions(keys.map((key) => ({ name: `${key}.read`, description: key })))
    .map((group) => group.label), ['Bienes Raíces', 'Proyectos', 'Noticias', 'Mensajes', 'Medios', 'Empresa', 'Usuarios', 'Roles', 'Historial', 'Acceso total']);
});

test('seleccionar y limpiar un grupo preserva otros permisos sin duplicar ni mutar', () => {
  const selected = ['news.edit', 'properties.create'];
  const group = { items: [{ name: 'properties.create' }, { name: 'properties.edit.own' }] };
  const all = setPermissionGroup(selected, group, true);
  assert.deepEqual(all, ['news.edit', 'properties.create', 'properties.edit.own']);
  assert.deepEqual(setPermissionGroup(all, group, false), ['news.edit']);
  assert.deepEqual(selected, ['news.edit', 'properties.create']);
});

test('estado inicial de creación y edición es independiente de la respuesta del servidor', () => {
  assert.deepEqual(roleDraft(), { name: '', description: '', active: true, permissions: [] });
  const original = role();
  const draft = roleDraft(original);
  draft.permissions.push('news.edit');
  draft.name = 'Otro';
  assert.equal(original.name, 'Empleado');
  assert.equal(original.permissions.length, 3);
  assert.equal(roleDraft({ ...original, active: false, description: null }).active, false);
  assert.equal(roleDraft({ ...original, description: null }).description, '');
});

test('payload de rol con tres permisos respeta los campos del contrato y no agrega id', () => {
  const draft = { ...roleDraft(role()), name: ' Colaborador ', description: ' Descripción ', active: false };
  assert.deepEqual(makeRolePayload(draft), { name: 'Colaborador', description: 'Descripción', active: false,
    permissions: ['properties.create', 'properties.edit.own', 'properties.trash.own'] });
  assert.deepEqual(makeRolePayload({ ...draft, permissions: [] }).permissions, []);
  assert.equal(makeRolePayload({ ...draft, permissions: ['news.edit', 'news.edit'] }).permissions.length, 1);
});

test('payload de Ingeniero solo envía descripción y conserva los campos protegidos', () => {
  const original = { ...role(), name: 'Ingeniero', permissions: ['admin.all'] };
  const draft = { ...roleDraft(original), name: 'Ataque', active: false, permissions: [], description: ' Revisada ' };
  assert.deepEqual(makeRolePayload(draft, original), { description: 'Revisada' });
  assert.deepEqual(original.permissions, ['admin.all']);
});

test('restaurar los permisos originales elimina el aviso de cambios aunque cambie su orden', () => {
  const baseline = roleDraft(role());
  const group = { items: [{ name: 'properties.create' }] };
  const withoutCreate = setPermissionGroup(baseline.permissions, group, false);
  assert.equal(roleHasChanges({ ...baseline, permissions: withoutCreate }, baseline), true);
  const restored = setPermissionGroup(withoutCreate, group, true);
  assert.notDeepEqual(restored, baseline.permissions);
  assert.equal(roleHasChanges({ ...baseline, permissions: restored }, baseline), false);
  assert.deepEqual(baseline.permissions, role().permissions);
});

test('detecta cambios reales en los datos y permisos sin confundir espacios descartados al guardar', () => {
  const baseline = roleDraft(role());
  assert.equal(roleHasChanges({ ...baseline, name: ` ${baseline.name} ` }, baseline), false);
  for (const changes of [{ name: 'Nuevo nombre' }, { description: 'Nueva descripción' },
    { active: false }, { permissions: ['properties.publish'] }]) {
    assert.equal(roleHasChanges({ ...baseline, ...changes }, baseline), true);
  }
  const engineer = { ...role(), name: 'Ingeniero' };
  const protectedDraft = roleDraft(engineer);
  assert.equal(roleHasChanges({ ...protectedDraft, name: 'Otro', active: false,
    permissions: [] }, protectedDraft, engineer), false);
  assert.equal(roleHasChanges({ ...protectedDraft, description: 'Revisada' }, protectedDraft, engineer), true);
});

test('identifica el rol propio entre múltiples roles para actualizar la sesión', () => {
  assert.equal(isOwnRole({ role: 'Ingeniero', roles: ['Ingeniero', 'Empleado'] }, role()), true);
  assert.equal(isOwnRole({ role: 'Empleado' }, role()), true);
  assert.equal(isOwnRole({ role: 'Ingeniero', roles: ['Ingeniero'] }, role()), false);
  assert.equal(isOwnRole(null, role()), false);
});

test('lee roles activos e inactivos y rechaza respuestas incompatibles', () => {
  assert.equal(readRoles([role(), { ...role(), active: false }]).length, 2);
  assert.equal(readRole({ ...role(), description: null }).description, '');
  for (const value of [null, { ...role(), id: '3' }, { ...role(), permissions: [null] }, { ...role(), active: 'true' }]) {
    assert.throws(() => readRole(value), TypeError);
  }
  assert.throws(() => readRoles({ results: [] }), TypeError);
  assert.throws(() => readPermissions([{ name: 'x' }, { name: 'x' }]), TypeError);
  assert.throws(() => readPermissions([{ name: 7 }]), TypeError);
});

test('errores por campo preservan las reglas del servidor y 501 nunca indica éxito', () => {
  assert.deepEqual(roleFieldErrors({ status: 400, details: {
    name: ['Este nombre está reservado.'], permissions: ['Permiso desconocido.'], unknown: 'x',
  } }), { name: 'Este nombre está reservado.', permissions: 'Permiso desconocido.' });
  assert.deepEqual(roleFieldErrors({ status: 500, details: { name: 'x' } }), {});
  assert.match(roleRequestError({ status: 501 }), /no está implementada/);
  assert.match(roleRequestError({ status: 401 }), /sesión/);
  assert.equal(roleRequestError({ status: 403, message: 'Permiso requerido: roles.manage' }), 'Permiso requerido: roles.manage');
  assert.match(roleRequestError({ status: 404 }), /No se encontró/);
});

test('servicio usa GET, POST y PATCH en rutas reales con Bearer y cancelación', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(role()), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const controller = new AbortController();
  await rolesService.list('access', controller.signal);
  await rolesService.permissions('access', controller.signal);
  await rolesService.get(3, 'access', controller.signal);
  await rolesService.create(makeRolePayload(roleDraft(role())), 'access');
  await rolesService.update(3, { description: 'Nueva' }, 'access');
  assert.deepEqual(calls.map((call) => [call.url, call.options.method]), [
    ['/api/v1/admin/roles/', 'GET'], ['/api/v1/admin/permissions/', 'GET'],
    ['/api/v1/admin/roles/3/', 'GET'], ['/api/v1/admin/roles/', 'POST'], ['/api/v1/admin/roles/3/', 'PATCH'],
  ]);
  for (const call of calls) assert.equal(call.options.headers.Authorization, 'Bearer access');
  assert.equal(calls[0].options.signal, controller.signal);
  assert.deepEqual(JSON.parse(calls[4].options.body), { description: 'Nueva' });
});

test('servicio rechaza 501 y expone el error de campos sin simular un guardado', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: {
    code: 'not_implemented', message: 'Pendiente',
  } }), { status: 501, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(rolesService.create(makeRolePayload(roleDraft(role())), 'access'), { status: 501, code: 'not_implemented' });
});
