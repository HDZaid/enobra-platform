import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateProperty, canEditProperty, canTogglePublished, canTrashProperty, trashBlockedReason,
} from '../src/features/admin-properties/utils/propertyPermissions.js';
import {
  buildPropertyQuery, describePropertyError, filterByStatus, formatPropertyDate, formatPropertyPrice,
  statusLabel, totalPages,
} from '../src/features/admin-properties/utils/propertyList.js';
import { adminPropertiesService, mapAdminPage } from '../src/features/admin-properties/services/adminPropertiesService.js';

const user = (...permissions) => ({ permissions });
const draft = { id: 1, published: false };
const live = { id: 2, published: true };
const engineer = user('admin.all');
const architect = user('properties.create', 'properties.edit.any', 'properties.publish', 'properties.trash.any', 'properties.restore');
const employee = user('properties.create', 'properties.edit.own', 'properties.trash.own');

test('Ingeniero (admin.all) puede todo', () => {
  assert.equal(canCreateProperty(engineer), true);
  for (const item of [draft, live]) {
    assert.equal(canEditProperty(engineer, item), true);
    assert.equal(canTogglePublished(engineer, item), true);
    assert.equal(canTrashProperty(engineer, item), true);
  }
});

test('Arquitecta publica y envía a papelera cualquier propiedad', () => {
  assert.equal(canTogglePublished(architect, live), true);
  assert.equal(canTrashProperty(architect, live), true);
  assert.equal(canCreateProperty(architect), true);
});

test('Empleado solo toca borradores y nunca publica', () => {
  assert.equal(canEditProperty(employee, draft), true);
  assert.equal(canEditProperty(employee, live), false);
  assert.equal(canTogglePublished(employee, draft), false);
  assert.equal(canTrashProperty(employee, draft), true);
  assert.equal(canTrashProperty(employee, live), false);
  assert.match(trashBlockedReason(employee, live), /solo puedes enviar borradores/);
  assert.equal(trashBlockedReason(employee, draft), '');
});

test('sin permisos no hay acciones y el motivo lo explica', () => {
  const nobody = user();
  assert.equal(canCreateProperty(nobody), false);
  assert.equal(canTrashProperty(nobody, draft), false);
  assert.match(trashBlockedReason(nobody, draft), /no puede enviar/);
  assert.equal(canTrashProperty(undefined, draft), false);
});

test('un permiso de publicar sin edición no basta para despublicar', () => {
  const publisherOnly = user('properties.publish');
  assert.equal(canTogglePublished(publisherOnly, draft), false);
  assert.equal(canTogglePublished(user('properties.publish', 'properties.edit.own'), draft), true);
  assert.equal(canTogglePublished(user('properties.publish', 'properties.edit.own'), live), false);
});

test('arma la consulta sin enviar el estado ni parámetros vacíos', () => {
  assert.equal(buildPropertyQuery({}), '?page=1&page_size=12');
  assert.equal(
    buildPropertyQuery({ q: '  casa  ', operation: 'Venta', type: 'Casa', zone: 'Zona 9', page: 3, status: 'draft' }),
    '?q=casa&operation=Venta&type=Casa&zone=Zona+9&page=3&page_size=12',
  );
});

test('filtra por estado sin mutar la lista', () => {
  const rows = [live, draft, { id: 3, published: true }];
  assert.deepEqual(filterByStatus(rows, 'draft').map((r) => r.id), [1]);
  assert.deepEqual(filterByStatus(rows, 'published').map((r) => r.id), [2, 3]);
  assert.equal(filterByStatus(rows, 'all'), rows);
  assert.equal(rows.length, 3);
});

test('formatea precio, fecha, estado y páginas', () => {
  assert.equal(formatPropertyPrice({ price: 1250000, operation: 'Venta' }).replace(/\s/g, ' '), 'Q 1,250,000');
  assert.match(formatPropertyPrice({ price: 3500, operation: 'Alquiler' }), /\/ mes$/);
  assert.equal(formatPropertyDate('no es fecha'), '—');
  assert.match(formatPropertyDate('2026-10-23'), /2026/);
  assert.equal(statusLabel({ published: false, demo: false }), 'Borrador');
  assert.equal(statusLabel({ published: true, demo: true }), 'Referencia · Publicada');
  assert.equal(totalPages(0), 1);
  assert.equal(totalPages(25), 3);
});

test('traduce errores de la API a mensajes en español', () => {
  const e = (status, message = `Error HTTP ${status}`) => Object.assign(new Error(message), { status });
  assert.match(describePropertyError(e(401), 'x'), /sesión venció/);
  assert.equal(describePropertyError(e(403, 'Solo puedes editar tus propios borradores.'), 'x'), 'Solo puedes editar tus propios borradores.');
  assert.match(describePropertyError(e(403), 'publicar'), /no tiene permiso para publicar/);
  assert.match(describePropertyError(e(404), 'x'), /ya no existe/);
  assert.match(describePropertyError(e(429), 'x'), /Demasiados/);
  assert.match(describePropertyError(e(501), 'consultar'), /aún no tiene disponible/);
  assert.match(describePropertyError(new TypeError('Failed to fetch'), 'x'), /conectar/);
  assert.match(describePropertyError(e(500), 'publicar'), /No se pudo publicar/);
});

const raw = (over = {}) => ({
  id: 7, title: 'Casa', operation: 'Venta', type: 'Casa', zone: 'Zona 9', location: 'Guatemala', price: 100, rooms: 2, baths: 1,
  parking: 1, area: 90, date: '2026-10-01', description: 'd', commercial: 'c', images: ['/media/a.jpg'], renders: [], video: '',
  demo: false, published: false, ...over,
});

test('el listado administrativo conserva los borradores (el público los descarta)', () => {
  const page = mapAdminPage({ count: 2, page: 1, page_size: 12, results: [raw(), raw({ id: 8, published: true })] });
  assert.deepEqual(page.results.map((r) => r.published), [false, true]);
  assert.deepEqual(page.results[0].images, ['/media/a.jpg']);
});

test('rechaza respuestas que no cumplen el contrato', () => {
  assert.throws(() => mapAdminPage({ results: [] }), /contrato/);
  assert.throws(() => mapAdminPage({ count: 1, page: 1, results: [raw({ title: 5 })] }), /contrato/);
});

test('el servicio valida ids y estados antes de llamar a la API', async () => {
  await assert.rejects(adminPropertiesService.setPublished('abc', true, 't'), /inválido/);
  await assert.rejects(adminPropertiesService.setPublished(3, 'si', 't'), /inválido/);
  await assert.rejects(adminPropertiesService.trash('0', 't'), /inválido/);
});

test('el servicio envía PATCH parcial y DELETE con token', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method, body: init.body, auth: init.headers.Authorization });
    const json = init.method === 'DELETE' ? null : raw({ published: true });
    return new Response(json ? JSON.stringify(json) : null, { status: json ? 200 : 204, headers: json ? { 'content-type': 'application/json' } : {} });
  };
  try {
    await adminPropertiesService.setPublished(7, true, 'tok');
    await adminPropertiesService.trash(7, 'tok');
  } finally { globalThis.fetch = original; }
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].body, '{"published":true}');
  assert.match(calls[0].url, /properties\/7\/$/);
  assert.equal(calls[0].auth, 'Bearer tok');
  assert.equal(calls[1].method, 'DELETE');
});
