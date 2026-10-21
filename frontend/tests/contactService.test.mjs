import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  contactService,
  readContactReceipt,
} from '../src/features/contact/services/contactService.js';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const receipt = { id: '42', status: 'nuevo', created_at: '2026-10-20T12:00:00Z' };

test('confirma solo un acuse de contacto con el contrato esperado', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/inquiries/contact/');
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).name, 'Ana');
    return new Response(JSON.stringify(receipt), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  assert.deepEqual(await contactService.send({ name: 'Ana' }), receipt);
});

test('un HTTP exitoso sin acuse no se presenta como mensaje guardado', async () => {
  globalThis.fetch = async () =>
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(contactService.send({ name: 'Ana' }), TypeError);
  for (const invalid of [
    null,
    { ...receipt, id: '' },
    { ...receipt, status: 'unknown' },
    { ...receipt, created_at: 'invalid' },
  ]) {
    assert.throws(() => readContactReceipt(invalid), TypeError);
  }
});

test('propaga el 501 real sin confirmar el envío', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { code: 'not_implemented', message: 'Pendiente' } }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  await assert.rejects(
    contactService.send({ name: 'Ana' }),
    (error) => error.status === 501 && error.code === 'not_implemented',
  );
});
