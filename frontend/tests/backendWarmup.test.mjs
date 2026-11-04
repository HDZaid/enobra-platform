import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
let instance = 0;
const load = () => import(`../src/services/backendWarmup.js?test=${instance++}`);

test('espera la visita a Inicio y reutiliza una sola petición sin credenciales', async () => {
  const calls = [];
  let finish;
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return new Promise((resolve) => { finish = resolve; });
  };
  const { warmBackend } = await load();
  assert.equal(calls.length, 0);
  const first = warmBackend();
  assert.equal(warmBackend(), first);
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/v1/health/');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers, undefined);
  finish(new Response('{"status":"ok"}'));
  await first;
  await warmBackend();
  assert.equal(calls.length, 1);
});

test('un fallo de red no bloquea la página ni crea un bucle de peticiones', async () => {
  let count = 0;
  globalThis.fetch = async () => { count += 1; throw new TypeError('Offline'); };
  const { warmBackend } = await load();
  await assert.doesNotReject(warmBackend());
  await warmBackend();
  assert.equal(count, 1);
});

test('tolera los primeros 45 segundos y cancela a los 75 segundos', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  globalThis.fetch = (_, options) => {
    signal = options.signal;
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  };
  const { warmBackend } = await load();
  const pending = warmBackend();
  await Promise.resolve();
  t.mock.timers.tick(45_000);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(30_000);
  await assert.doesNotReject(pending);
  assert.equal(signal.aborted, true);
});
