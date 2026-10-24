import test from 'node:test';
import assert from 'node:assert/strict';
import { actionColor, actionLabel, emptyHistoryFilters, formatHistoryDate, historyFilename, historyPermissions, historyQuery, moduleLabel, previewHistory, previewHistoryPage, readHistoryPage, validateHistoryFilters } from '../src/features/admin-history/utils/history.js';
import { historyService } from '../src/features/admin-history/services/historyService.js';

const filters = () => ({ ...emptyHistoryFilters(), q: ' casa & jardín ', module: 'properties', action: 'CREAR', user_id: '2', date_from: '2026-10-01', date_to: '2026-10-24' });

test('etiquetas traducen conocidos y conservan valores desconocidos', () => {
  assert.equal(moduleLabel('properties'), 'Bienes Raíces');
  assert.equal(moduleLabel('inquiries'), 'Mensajes');
  assert.equal(actionLabel('ELIMINAR_PERMANENTE'), 'Eliminar definitivamente');
  for (const value of ['MODULO_NUEVO', 'ACCION_NUEVA', '__proto__', 'constructor']) {
    assert.equal(moduleLabel(value), value); assert.equal(actionLabel(value), value);
    assert.equal(typeof actionColor(value), 'string');
  }
});

test('audit.read no concede exportación ni filtro por usuario', () => {
  assert.deepEqual(historyPermissions({ permissions: ['audit.read'] }), { read: true, export: false, users: false });
  assert.deepEqual(historyPermissions({ permissions: ['admin.all'] }), { read: true, export: true, users: true });
  for (const permission of ['users.read', 'users.manage']) assert.equal(historyPermissions({ permissions: [permission] }).users, true);
  assert.equal(historyPermissions({ role: 'Ingeniero' }).read, false);
  assert.equal(historyPermissions({ permissions: ['audit.export'] }).read, false);
});

test('filtros combinados, URL escapada y exportación sin paginación', () => {
  const query = new URLSearchParams(historyQuery(filters(), { page: 2, allowUser: true }));
  assert.deepEqual(Object.fromEntries(query), { page: '2', page_size: '12', q: 'casa & jardín', module: 'properties', action: 'CREAR', user_id: '2', date_from: '2026-10-01', date_to: '2026-10-24' });
  const exported = new URLSearchParams(historyQuery(filters(), { allowUser: true }));
  query.delete('page'); query.delete('page_size');
  assert.equal(exported.toString(), query.toString());
  assert.equal(new URLSearchParams(historyQuery(filters())).has('user_id'), false);
  assert.equal(historyQuery(emptyHistoryFilters()), '');
});

test('validación de fechas reales, orden del rango y usuario positivo', () => {
  assert.equal(validateHistoryFilters(filters()), '');
  for (const changes of [{ date_from: '2026-02-30' }, { date_to: '2026-09-01' }, { user_id: '-1' }, { user_id: '1.2' }]) {
    assert.notEqual(validateHistoryFilters({ ...filters(), ...changes }), '');
    assert.throws(() => historyQuery({ ...filters(), ...changes }, { allowUser: true }));
  }
  assert.throws(() => historyQuery(filters(), { page: 0 }));
});

test('mapeo acepta nulos y etiquetas nuevas sin sustituir datos por ejemplos', () => {
  const data = { count: 1, page: 1, page_size: 12, results: [{ ...previewHistory[0], record_id: null, record_name: null, description: null }] };
  assert.deepEqual(readHistoryPage(data), data);
  assert.deepEqual(readHistoryPage({ ...data, count: 0, results: [] }).results, []);
  assert.notEqual(readHistoryPage(data).results[0], data.results[0]);
  assert.ok(formatHistoryDate(previewHistory[0].date).includes('2026'));
  assert.equal(historyFilename(new Date(2026, 9, 24, 12)), 'historial-2026-10-24.csv');
});

test('rechaza respuestas incompletas, HTML y eventos inválidos', () => {
  const data = previewHistoryPage(emptyHistoryFilters(), 1);
  for (const invalid of [null, '<html>', {}, { ...data, count: -1 }, { ...data, page: 0 }, { ...data, results: [{ ...previewHistory[0], date: 'bad' }] },
    { ...data, results: [{ ...previewHistory[0], user: null }] }, { ...data, results: [{ ...previewHistory[0], description: {} }] }]) assert.throws(() => readHistoryPage(invalid));
});

test('demostración filtra y pagina sin alterar los datos', () => {
  assert.equal(previewHistoryPage(emptyHistoryFilters(), 1).results.length, 12);
  assert.equal(previewHistoryPage(emptyHistoryFilters(), 2).results.length, 3);
  const selected = previewHistoryPage({ ...emptyHistoryFilters(), module: 'modulo_nuevo', action: 'ACCION_NUEVA', user_id: '1', date_from: '2026-10-24', date_to: '2026-10-24' }, 1);
  assert.equal(selected.count, 1);
  assert.equal(previewHistoryPage({ ...emptyHistoryFilters(), q: 'inexistente' }, 1).count, 0);
  assert.equal(previewHistory.length, 15);
});

test('servicio envía filtros, token y señal al listado real', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.startsWith('/api/v1/admin/audit/?'));
    const params = new URL(url, 'https://example.test').searchParams;
    assert.equal(params.get('user_id'), '2'); assert.equal(params.get('page'), '2'); assert.equal(params.get('action'), 'CREAR');
    assert.equal(options.headers.Authorization, 'Bearer test-only'); assert.equal(options.signal, controller.signal);
    return Response.json(previewHistoryPage(emptyHistoryFilters(), 2));
  });
  const data = await historyService.list(filters(), { page: 2, allowUser: true, token: 'test-only', signal: controller.signal });
  assert.equal(data.results.length, 3);
});

test('exportación conserva CSV del servidor y omite paginación', async (t) => {
  const csv = 'id,user_id,user_name,action,module,record_id,record_name,description,date\r\n1,2,Ejemplo,CREAR,properties,1,Casa,Ejemplo,2026-10-24\r\n';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.startsWith('/api/v1/admin/audit/export/?'));
    const params = new URL(url, 'https://example.test').searchParams;
    assert.equal(params.has('page'), false); assert.equal(params.has('user_id'), false);
    assert.equal(params.get('q'), 'casa & jardín'); assert.equal(options.headers.Authorization, 'Bearer test-only');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv' } });
  });
  assert.equal(await historyService.exportCsv(filters(), { token: 'test-only' }), csv);
});

test('errores reales no se reemplazan por demostración ni por archivo descargable', async (t) => {
  for (const status of [400, 401, 403, 404, 429, 501]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Error de prueba' } }, { status }));
    await assert.rejects(historyService.list(emptyHistoryFilters()), { status });
    await assert.rejects(historyService.exportCsv(emptyHistoryFilters()), { status });
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>'));
  await assert.rejects(historyService.exportCsv(emptyHistoryFilters()), /CSV/);
});
