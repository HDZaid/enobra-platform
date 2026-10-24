import test from 'node:test';
import assert from 'node:assert/strict';
import { describeApiError, fieldErrors } from '../src/components/ui/apiErrors.js';
import { ApiError } from '../src/services/apiClient.js';

for (const [status, phrase] of [[400, 'Revisa los datos'], [401, 'Tu sesión venció'], [403, 'Sin permiso'], [404, 'No encontramos'], [413, 'demasiado grande'], [429, 'Demasiados intentos'], [501, 'Módulo aún no disponible']]) {
  test(`describeApiError explica HTTP ${status}`, () => {
    assert.ok(describeApiError(new ApiError('Error HTTP', status)).includes(phrase));
  });
}

test('distingue red, cancelación y fallo del servidor sin exponer detalles internos', () => {
  for (const error of [new TypeError('Failed to fetch'), { status: 0 }, { code: 'network_error' }]) {
    assert.match(describeApiError(error), /Revisa tu conexión/);
  }
  assert.match(describeApiError({ name: 'AbortError' }), /canceló/);
  assert.equal(describeApiError(new ApiError('detalle interno', 500), { action: 'guardar el proyecto' }), 'No se pudo guardar el proyecto. Inténtalo de nuevo.');
  assert.match(describeApiError(new Error('fallo interno')), /completar la operación/);
  assert.match(describeApiError(null), /completar la operación/);
});

test('fieldErrors combina mensajes DRF por campo y conserva errores generales', () => {
  const error = new ApiError('Validación', 400, 'validation_error', {
    title: ['Obligatorio.', 'Máximo 160 caracteres.'],
    price: 'Debe ser positivo.',
    images: { 0: ['URL inválida.'] },
    non_field_errors: ['Revisa la publicación.'],
    empty: [], invalid: null,
  });
  assert.deepEqual(fieldErrors(error), {
    title: 'Obligatorio. Máximo 160 caracteres.', price: 'Debe ser positivo.',
    images: 'URL inválida.', non_field_errors: 'Revisa la publicación.',
  });
});

test('fieldErrors ignora respuestas sin validación y estructuras inválidas', () => {
  for (const error of [null, {}, { status: 403, details: { title: 'No' } }, { status: 400, details: 'Error' }, { status: 400, details: ['Error'] }]) {
    assert.deepEqual(fieldErrors(error), {});
  }
});
