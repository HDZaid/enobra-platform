import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewTrash, ownsTrashOnly, trashActions, readTrashPage, formatTrashDate } from '../src/features/admin-trash/utils/trash.js';
import { trashService } from '../src/features/admin-trash/services/trashService.js';

const user = (...permissions) => ({ id: '7', permissions });
const item = (type = 'properties') => ({ type, id: type === 'properties' ? '12' : 'casa-zona-9', title: 'Casa en Zona 9',
  trashed_at: '2026-10-24T08:00:00Z', trashed_by: '7', trashed_by_name: 'Persona de prueba', was_published: true, owner_id: '7' });
const page = (type = 'properties') => ({ count: 1, page: 1, page_size: 12, results: [item(type)] });

test('Ingeniero ve ambos tipos y puede restaurar y eliminar definitivamente', () => {
  for (const type of ['properties', 'projects']) {
    assert.equal(canViewTrash(user('admin.all'), type), true);
    assert.deepEqual(trashActions(user('admin.all'), type), { restore: true, remove: true });
    assert.equal(ownsTrashOnly(user('admin.all'), type), false);
  }
  assert.equal(canViewTrash(user('admin.all'), 'news'), false);
  assert.deepEqual(trashActions(user('admin.all'), 'news'), { restore: false, remove: false });
});

test('Empleado solo tiene su papelera de propiedades, sin acciones destructivas', () => {
  const employee = user('properties.trash.own', 'properties.create');
  assert.equal(canViewTrash(employee, 'properties'), true);
  assert.equal(canViewTrash(employee, 'projects'), false);
  assert.equal(ownsTrashOnly(employee, 'properties'), true);
  assert.deepEqual(trashActions(employee, 'properties'), { restore: false, remove: false });
});

test('los permisos se evalúan por tipo y acción, sin deducirlos del nombre del rol', () => {
  const restorer = user('projects.restore', 'properties.trash.any');
  assert.deepEqual(trashActions(restorer, 'projects'), { restore: true, remove: false });
  assert.deepEqual(trashActions(restorer, 'properties'), { restore: false, remove: false });
  assert.equal(ownsTrashOnly(restorer, 'properties'), false);
  assert.deepEqual(trashActions(user('properties.delete_permanently'), 'properties'), { restore: false, remove: true });
  assert.equal(canViewTrash({ role: 'Ingeniero' }, 'properties'), false);
  assert.equal(canViewTrash(user('projects.create'), 'projects'), false);
});

test('mapeo conserva slug, estado previo, propietario y metadatos nulos', () => {
  for (const type of ['properties', 'projects']) assert.deepEqual(readTrashPage(page(type), type), page(type));
  const data = page();
  Object.assign(data.results[0], { trashed_by: null, trashed_by_name: null, owner_id: null, was_published: false });
  assert.deepEqual(readTrashPage(data, 'properties'), data);
  assert.deepEqual(readTrashPage({ count: 0, page: 1, page_size: 12, results: [] }, 'properties').results, []);
});

test('rechaza contratos incompletos, tipo mezclado e identificadores inválidos', () => {
  for (const data of [null, {}, { ...page(), count: -1 }, { ...page(), page_size: 0 }, { ...page(), results: [item('projects')] },
    { ...page(), results: [{ ...item(), id: '../12' }] }, { ...page(), results: [{ ...item(), was_published: 'false' }] },
    { ...page(), results: [{ ...item(), trashed_at: 'invalid' }] }, { ...page(), results: [{ ...item(), owner_id: undefined }] }]) {
    assert.throws(() => readTrashPage(data, 'properties'));
  }
  assert.equal(formatTrashDate('invalid'), 'Fecha no disponible');
  assert.ok(formatTrashDate(item().trashed_at).includes('2026'));
});

test('listado solicita página y tipo con Bearer y AbortSignal, sin inventar filtro de dueño', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/admin/trash/?type=properties&page=2&page_size=12');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.equal(options.signal, controller.signal);
    return Response.json({ ...page(), count: 13, page: 2 });
  });
  const result = await trashService.list('properties', 2, 'test-only', { signal: controller.signal });
  assert.equal(result.page, 2);
});

test('restaurar y eliminar usan rutas administrativas específicas y aceptan 204', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 204 }); });
  await trashService.restore('properties', '12', 'test-only');
  await trashService.remove('properties', '12', 'test-only');
  await trashService.restore('projects', 'casa-zona-9', 'test-only');
  await trashService.remove('projects', 'casa-zona-9', 'test-only');
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['/api/v1/admin/properties/12/restore/', 'POST'], ['/api/v1/admin/properties/12/permanent/', 'DELETE'],
    ['/api/v1/admin/projects/casa-zona-9/restore/', 'POST'], ['/api/v1/admin/projects/casa-zona-9/permanent/', 'DELETE'],
  ]);
  assert.ok(calls.every(({ options }) => options.headers.Authorization === 'Bearer test-only' && options.body === undefined));
});

test('errores 401/403/404/429/501 se propagan sin simular operaciones exitosas', async (t) => {
  for (const status of [401, 403, 404, 429, 501]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Error de prueba', code: 'test' } }, { status }));
    await assert.rejects(trashService.list('properties', 1, 'test-only'), { status });
    await assert.rejects(trashService.restore('properties', 12, 'test-only'), { status });
    await assert.rejects(trashService.remove('projects', 'casa', 'test-only'), { status });
    t.mock.restoreAll();
  }
});

test('rechaza identificadores antes de enviar y no presenta JSON inesperado como confirmación', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
  await assert.rejects(trashService.remove('properties', '../12', 'test-only'));
  await assert.rejects(trashService.restore('projects', 'casa/otra', 'test-only'));
  await assert.rejects(trashService.list('news', 1, 'test-only'));
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(trashService.restore('properties', 12, 'test-only'), /no confirmó/);
});
