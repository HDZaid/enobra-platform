import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { apiRequest, ApiError } from '../src/services/apiClient.js';
import { newsService } from '../src/features/news/services/newsService.js';
import { contactService } from '../src/features/contact/services/contactService.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('consulta noticias usando el prefijo de Django y los filtros', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ results: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  const result = await newsService.list({ category: 'Eventos', page: 2 });
  assert.deepEqual(result, { results: [] });
  assert.equal(request.url, '/api/v1/news/?category=Eventos&page=2');
  assert.equal(request.options.method, 'GET');
});

test('envía el formulario de contacto como JSON', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: '1', status: 'nuevo' }), {
      status: 201, headers: { 'content-type': 'application/json' },
    });
  };
  await contactService.send({ name: 'Prueba' });
  assert.equal(request.url, '/api/v1/inquiries/contact/');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), { name: 'Prueba' });
});

test('propaga el formato de errores del backend', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 'not_implemented', message: 'Pendiente de persistencia' },
  }), { status: 501, headers: { 'content-type': 'application/json' } });
  await assert.rejects(apiRequest('news/'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 501);
    assert.equal(error.code, 'not_implemented');
    return true;
  });
});

test('acepta respuestas sin cuerpo como DELETE 204', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await apiRequest('news/demo/', { method: 'DELETE' }), null);
});

test('incluye Bearer token solo cuando se suministra', async () => {
  let authHeader;
  globalThis.fetch = async (_, options) => {
    authHeader = options.headers.Authorization;
    return new Response(null, { status: 204 });
  };
  await apiRequest('auth/me/', { token: 'token-prueba' });
  assert.equal(authHeader, 'Bearer token-prueba');
});
