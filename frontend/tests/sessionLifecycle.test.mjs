import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionLifecycle } from '../src/features/admin/services/sessionLifecycle.js';
import { apiRequest } from '../src/services/apiClient.js';
import { installAdminTransport } from '../src/services/adminTransport.js';

const payload = { access: 'access-1', refresh: 'refresh-1', expires_in: 900 };
function fixture(options = {}) {
  let time = 1000;
  let view;
  let calls = 0;
  let revoked = 0;
  const lifecycle = createSessionLifecycle({ now: () => time,
    visible: () => true,
    refresh: async () => { calls++; return { access: 'access-2', expires_in: 900 }; },
    revoke: async () => { revoked++; }, onChange: (value) => { view = value; }, ...options });
  lifecycle.start(payload);
  return { lifecycle, advance(ms) { time += ms; }, get view() { return view; },
    get calls() { return calls; }, get revoked() { return revoked; } };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('sin actividad no renueva; avisa 60 segundos antes y revoca al vencer', async () => {
  const f = fixture();
  f.advance(840000); f.lifecycle.tick();
  assert.equal(f.view.status, 'warning'); assert.equal(f.view.seconds, 60);
  f.advance(60000); f.lifecycle.tick(); await flush();
  assert.equal(f.view.status, 'expired'); assert.equal(f.calls, 0); assert.equal(f.revoked, 1);
  assert.throws(() => f.lifecycle.resolveToken('access-1'), { code: 'session_expired' });
  f.lifecycle.activity(); f.lifecycle.tick(); await flush(); assert.equal(f.revoked, 1);
});
test('con actividad renueva una sola vez y resuelve el token sin desmontar formularios', async () => {
  const f = fixture();
  f.advance(1000); f.lifecycle.activity(); f.advance(840000);
  f.lifecycle.tick(); f.lifecycle.activity(); f.lifecycle.tick();
  await flush();
  assert.equal(f.calls, 1); assert.equal(f.lifecycle.resolveToken('access-1'), 'access-2');
  assert.equal(f.view.status, 'active');
});
test('la actividad durante el aviso permite continuar', async () => {
  const f = fixture(); f.advance(850000); f.lifecycle.tick(); assert.equal(f.view.status, 'warning');
  f.lifecycle.activity(); await flush(); assert.equal(f.calls, 1); assert.equal(f.view.status, 'active');
});
test('el límite de inactividad no se reinicia por renovar, consultar ni recibir respuestas', async () => {
  const f = fixture(); f.advance(300000); f.lifecycle.activity(); f.advance(540000);
  f.lifecycle.tick(); await flush(); assert.equal(f.calls, 1);
  f.advance(360000); f.lifecycle.tick(); await flush(); assert.equal(f.view.status, 'expired');
});
test('pestaña oculta no renueva y volver después del vencimiento no revive la sesión', async () => {
  const f = fixture({ visible: () => false });
  f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
  assert.equal(f.calls, 0); f.advance(60000); f.lifecycle.activity(); f.lifecycle.tick();
  assert.equal(f.view.status, 'expired');
});
test('una renovación tardía después de salir no reactiva credenciales', async () => {
  let resolve;
  const f = fixture({ refresh: () => new Promise((done) => { resolve = done; }) });
  f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
  f.lifecycle.stop(); resolve({ access: 'late', expires_in: 900 }); await flush();
  assert.equal(f.view.status, 'off'); assert.equal(f.lifecycle.resolveToken('access-1'), 'access-1');
});
test('revocación o respuesta inválida bloquean la sesión; un fallo de red permite reintento acotado', async () => {
  for (const refresh of [async () => { throw { status: 401 }; }, async () => ({ access: '', expires_in: 900 })]) {
    const f = fixture({ refresh }); f.advance(1000); f.lifecycle.activity(); f.advance(840000);
    f.lifecycle.tick(); await flush(); assert.equal(f.view.status, 'expired');
  }
  let calls = 0;
  const f = fixture({ refresh: async () => { calls++; throw new TypeError('Failed to fetch'); } });
  f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
  assert.equal(f.view.status, 'warning'); f.lifecycle.tick(); await flush(); assert.equal(calls, 1);
  f.advance(10000); f.lifecycle.tick(); await flush(); assert.equal(calls, 2);
});
test('una respuesta tardía tras el vencimiento no puede renovar', async () => {
  let resolve;
  const f = fixture({ refresh: () => new Promise((done) => { resolve = done; }) });
  f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
  f.advance(60000); f.lifecycle.tick(); resolve({ access: 'late', expires_in: 900 }); await flush();
  assert.equal(f.view.status, 'expired');
});
test('fetch usa el token renovado; no repite escrituras ni modifica peticiones públicas', async () => {
  const f = fixture(); const uninstall = installAdminTransport(f.lifecycle); const original = globalThis.fetch;
  try {
    f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++; assert.equal(options.headers.Authorization, 'Bearer access-2');
      return new Response(JSON.stringify({ error: { message: 'Revocada' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    };
    await assert.rejects(apiRequest('properties/1/', { method: 'PATCH', body: { title: 'Cambio' }, token: 'access-1' }));
    assert.equal(calls, 1); assert.equal(f.view.status, 'expired');
    await assert.rejects(apiRequest('properties/1/', { token: 'access-1' }), { code: 'session_expired' }); assert.equal(calls, 1);
    globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, undefined); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); };
    await apiRequest('company/');
  } finally { uninstall(); globalThis.fetch = original; }
});
test('un 401 de un token anterior no invalida una renovación ya confirmada', async () => {
  const f = fixture(); f.advance(1000); f.lifecycle.activity(); f.advance(840000); f.lifecycle.tick(); await flush();
  f.lifecycle.unauthorized('access-1'); assert.notEqual(f.view.status, 'expired');
  assert.equal(f.lifecycle.resolveToken('access-1'), 'access-2');
});
