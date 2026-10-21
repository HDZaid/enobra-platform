import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { newsService } from '../src/features/news/services/newsService.js';
import { inquiriesService } from '../src/features/admin/services/inquiriesService.js';
import { adminMediaService } from '../src/features/admin/services/adminMediaService.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

test('crear noticias envía el JSON correcto con autorización', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return jsonResponse({ id: 'noticia-nueva', title: 'Noticia nueva' }, 201);
  };
  const payload = { title: 'Noticia nueva', published: false };
  const response = await newsService.create(payload, 'token-123');
  assert.equal(call.url, '/api/v1/news/');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.Authorization, 'Bearer token-123');
  assert.deepEqual(JSON.parse(call.options.body), payload);
  assert.equal(response.id, 'noticia-nueva');
});

test('publicar noticias usa PATCH parcial sin alterar el resto de campos', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return jsonResponse({ id: 'obra-1', published: true });
  };
  await newsService.update('obra-1', { published: true }, 'token-123');
  assert.equal(call.url, '/api/v1/news/obra-1/');
  assert.equal(call.options.method, 'PATCH');
  assert.deepEqual(JSON.parse(call.options.body), { published: true });
});

test('eliminar noticias usa DELETE y acepta 204 sin respuesta', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return new Response(null, { status: 204 });
  };
  assert.equal(await newsService.remove('obra-1', 'token-123'), null);
  assert.equal(call.url, '/api/v1/news/obra-1/');
  assert.equal(call.options.method, 'DELETE');
  assert.equal(call.options.headers.Authorization, 'Bearer token-123');
});

test('bandeja usa filtros soportados y actualización de estado autorizada', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(calls.length === 1 ? { count: 0, results: [] } : { id: '5', status: 'atendido' });
  };
  await inquiriesService.list({ kind: 'contacto', status: 'nuevo', page: 2, page_size: 12 }, 'token-123');
  await inquiriesService.updateStatus('5', 'atendido', 'token-123');
  assert.equal(calls[0].url, '/api/v1/inquiries/?kind=contacto&status=nuevo&page=2&page_size=12');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-123');
  assert.equal(calls[1].url, '/api/v1/inquiries/5/');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].options.body), { status: 'atendido' });
});

test('subida de imagen envía FormData y valida la referencia devuelta', async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return jsonResponse({ url: 'https://cdn.example.com/noticias/portada.jpg' });
  };
  const file = new File(['imagen'], 'portada.jpg', { type: 'image/jpeg' });
  const url = await adminMediaService.uploadNewsImage(file, 'token-123');
  assert.equal(url, 'https://cdn.example.com/noticias/portada.jpg');
  assert.equal(call.url, '/api/v1/admin/media/');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['Content-Type'], undefined);
  assert.equal(call.options.body.get('kind'), 'news');
  assert.equal(call.options.body.get('file').name, 'portada.jpg');
  assert.equal(call.options.headers.Authorization, 'Bearer token-123');
});

test('rechaza referencias de imagen inválidas aunque la petición haya sido exitosa', async () => {
  globalThis.fetch = async () => jsonResponse({ url: 'javascript:alert(1)' });
  await assert.rejects(adminMediaService.uploadNewsImage(new File(['x'], 'a.png', { type: 'image/png' }), 'token'), TypeError);
});
