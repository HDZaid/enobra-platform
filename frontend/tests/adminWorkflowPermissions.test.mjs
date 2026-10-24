import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { adminActions, newsPayloadForPermissions } from '../src/features/admin/utils/adminData.js';
import { loadDashboardCounts } from '../src/features/admin/utils/dashboard.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('las acciones de noticias y mensajes son independientes', () => {
  const mapping = { createNews: 'news.create', editNews: 'news.edit', publishNews: 'news.publish', deleteNews: 'news.delete', manageInquiries: 'inquiries.manage' };
  for (const [action, permission] of Object.entries(mapping)) {
    const allowed = adminActions({ permissions: [permission] });
    assert.deepEqual(Object.keys(allowed).filter((key) => allowed[key]), [action]);
  }
  assert.ok(Object.values(adminActions({ permissions: ['inquiries.read'] })).every((v) => !v));
  assert.ok(Object.values(adminActions({ permissions: ['admin.all'] })).every(Boolean));
  assert.ok(Object.values(adminActions(null, true)).every(Boolean));
});

test('guardar noticias sin publicación conserva el estado en PATCH y crea borradores en POST', () => {
  const payload = { title: 'Noticia', published: true, image: '/media/a.jpg' };
  assert.deepEqual(newsPayloadForPermissions(payload), { ...payload, published: false });
  assert.deepEqual(newsPayloadForPermissions(payload, { existing: true }), { title: 'Noticia', image: '/media/a.jpg' });
  assert.deepEqual(newsPayloadForPermissions(payload, { existing: true, canPublish: true }), payload);
  assert.equal(payload.published, true);
});

test('resumen consulta solo módulos autorizados y envía token y paginación mínima', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.match(String(url), /page=1&page_size=1/);
    return new Response(JSON.stringify({ count: 17, results: [{ published: false }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.deepEqual(await loadDashboardCounts({ permissions: ['properties.create'] }, 'token'), { counts: { properties: 17 }, unavailable: false });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /properties\//);
  calls.length = 0;
  assert.deepEqual(await loadDashboardCounts({ permissions: [] }, 'token'), { counts: {}, unavailable: false });
  assert.equal(calls.length, 0);
});

test('el resumen conserva ceros y resultados válidos ante fallos parciales o contratos inválidos', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('/projects/')) throw new Error('sin red');
    const data = String(url).includes('/news/') ? { count: -1, results: [] } : { count: 0, results: [] };
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.deepEqual(await loadDashboardCounts({ permissions: ['admin.all'] }, 'token'), {
    counts: { news: null, messages: 0, projects: null, properties: 0 }, unavailable: true,
  });
});
