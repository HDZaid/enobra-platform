import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogFreshness, freshnessMessages } from '../src/features/projects/utils/catalogFreshness.js';

test('la respuesta de la API se muestra como confirmada', () => {
  assert.equal(catalogFreshness({ status: 'ready', data: {} }), 'fresh');
});

test('los datos guardados esperan la confirmación de la API', () => {
  assert.equal(catalogFreshness({ status: 'ready', data: {}, stale: true }), 'confirming');
});

test('si la API falla, los datos guardados quedan sin confirmar', () => {
  const resource = { status: 'ready', data: {}, stale: true, refreshError: { status: 503 } };
  assert.equal(catalogFreshness(resource), 'unconfirmed');
});

test('sin datos listos no hay etiqueta pendiente', () => {
  assert.equal(catalogFreshness({ status: 'loading' }), 'fresh');
  assert.equal(catalogFreshness({ status: 'error', error: {} }), 'fresh');
  assert.equal(catalogFreshness(undefined), 'fresh');
});

test('cada estado pendiente explica qué ocurre', () => {
  assert.match(freshnessMessages.confirming, /Confirmando/);
  assert.match(freshnessMessages.unconfirmed, /No pudimos confirmar/);
});
