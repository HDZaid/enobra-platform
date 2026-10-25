import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasNoRooms, makePropertyPayload, propertyDraft, todayIso, validatePropertyDraft,
} from '../src/features/admin-properties/utils/propertyForm.js';
import { adminPropertiesService } from '../src/features/admin-properties/services/adminPropertiesService.js';

const IMG = 'https://res.cloudinary.com/demo/image/upload/a.jpg';
const valid = (extra = {}) => ({
  ...propertyDraft(null, new Date(2026, 9, 24)), title: 'Casa en Zona 15', zone: 'Zona 15', location: 'Colonia Tecún Umán',
  price: '1500000', area: '240', rooms: '3', baths: '2', parking: '2', description: 'Casa amplia.',
  commercial: 'Financiamiento bancario.', images: [IMG], ...extra,
});

test('propertyDraft por defecto: borrador, venta, casa, fecha de hoy', () => {
  const d = propertyDraft(null, new Date(2026, 9, 24));
  assert.equal(d.published, false);
  assert.equal(d.operation, 'Venta');
  assert.equal(d.type, 'Casa');
  assert.equal(d.date, '2026-10-24');
  assert.equal(todayIso(new Date(2026, 0, 5)), '2026-01-05');
});

test('propertyDraft carga una propiedad existente como texto', () => {
  const d = propertyDraft({ title: 'X', operation: 'Alquiler', type: 'Local', zone: 'Z1', location: 'L', price: 5000, rooms: 0, baths: 1, parking: 2, area: 80, date: '2026-03-02', description: 'd', commercial: 'c', images: [IMG], renders: [], video: '', published: true });
  assert.equal(d.price, '5000');
  assert.equal(d.date, '2026-03-02');
  assert.equal(d.published, true);
});

test('un formulario completo es válido', () => assert.deepEqual(validatePropertyDraft(valid()), {}));

test('campos obligatorios y límites de texto', () => {
  const e = validatePropertyDraft(valid({ title: ' ', zone: 'z'.repeat(61), location: '', description: '', commercial: '' }));
  for (const key of ['title', 'zone', 'location', 'description', 'commercial']) assert.ok(e[key], key);
});

test('números: enteros, rangos del backend', () => {
  assert.ok(validatePropertyDraft(valid({ price: '-1' })).price);
  assert.ok(validatePropertyDraft(valid({ price: '10.5' })).price);
  assert.ok(validatePropertyDraft(valid({ price: '10000000000' })).price);
  assert.equal(validatePropertyDraft(valid({ price: '0' })).price, undefined);
  assert.ok(validatePropertyDraft(valid({ area: '0' })).area);
  assert.ok(validatePropertyDraft(valid({ area: '100000000' })).area);
  assert.ok(validatePropertyDraft(valid({ rooms: '1000' })).rooms);
  assert.ok(validatePropertyDraft(valid({ baths: 'a' })).baths);
});

test('fecha inexistente se rechaza', () => {
  assert.ok(validatePropertyDraft(valid({ date: '2026-02-31' })).date);
  assert.ok(validatePropertyDraft(valid({ date: '' })).date);
});

test('imágenes: mínimo 1, máximo 40, URLs válidas', () => {
  assert.ok(validatePropertyDraft(valid({ images: [] })).images);
  assert.ok(validatePropertyDraft(valid({ images: ['http://x.com/a.jpg'] })).images);
  assert.ok(validatePropertyDraft(valid({ images: Array(41).fill(IMG) })).images);
  assert.ok(validatePropertyDraft(valid({ renders: Array(41).fill(IMG) })).renders);
  assert.equal(validatePropertyDraft(valid({ images: ['/media/a.jpg'] })).images, undefined);
});

test('video: YouTube HTTPS o vacío', () => {
  assert.equal(validatePropertyDraft(valid({ video: '' })).video, undefined);
  assert.equal(validatePropertyDraft(valid({ video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).video, undefined);
  assert.ok(validatePropertyDraft(valid({ video: 'https://example.com/v' })).video);
});

test('Terreno ignora y envía en cero habitaciones, baños y parqueos', () => {
  assert.equal(hasNoRooms('Terreno'), true);
  const d = valid({ type: 'Terreno', rooms: 'x', baths: '', parking: '9' });
  assert.deepEqual(validatePropertyDraft(d), {});
  const p = makePropertyPayload(d, { canPublish: false });
  assert.deepEqual([p.rooms, p.baths, p.parking], [0, 0, 0]);
});

test('payload: demo false siempre; published false sin permiso', () => {
  const p = makePropertyPayload(valid({ title: '  Casa  ' }), { canPublish: false, publish: true });
  assert.equal(p.demo, false);
  assert.equal(p.published, false);
  assert.equal(p.title, 'Casa');
  assert.equal(typeof p.price, 'number');
});

test('payload: con permiso respeta guardar borrador / publicar', () => {
  assert.equal(makePropertyPayload(valid(), { canPublish: true, publish: true }).published, true);
  assert.equal(makePropertyPayload(valid(), { canPublish: true, publish: false }).published, false);
});

test('makePropertyPayload lanza si el formulario es inválido', () => {
  assert.throws(() => makePropertyPayload(valid({ title: '' })), TypeError);
});

test('servicio: get/update validan el identificador', async () => {
  await assert.rejects(() => adminPropertiesService.get('abc', 't'), TypeError);
  await assert.rejects(() => adminPropertiesService.update('0', {}, 't'), TypeError);
});
