import assert from 'node:assert/strict';
import test from 'node:test';
import { advancePreviewInquiry, demoInquiries, filterInquiries, formatInquiryDate, nextInquiryStatus, normalizeInquiry, paginateInquiries } from '../src/features/admin/utils/inbox.js';

test('normaliza solicitudes de Contacto y Visitas según el contrato de Django', () => {
  const item = normalizeInquiry({ id: 19, kind: 'visita', status: 'nuevo', name: 'Persona', email: null, phone: '55550000', property_id: 5, property_title: null });
  assert.equal(item.id, '19');
  assert.equal(item.email, '');
  assert.equal(item.property_id, 5);
  assert.equal(item.property_title, '');
  assert.throws(() => normalizeInquiry({ id: 1, name: 'Persona', kind: 'otra', status: 'nuevo' }), TypeError);
  assert.throws(() => normalizeInquiry({ id: 1, name: 'Persona', kind: 'contacto', status: 'respondido' }), TypeError);
});

test('respeta la secuencia de estados del backend: nuevo, atendido, archivado', () => {
  assert.equal(nextInquiryStatus('nuevo'), 'atendido');
  assert.equal(nextInquiryStatus('atendido'), 'archivado');
  assert.equal(nextInquiryStatus('archivado'), null);
  assert.equal(nextInquiryStatus('invalido'), null);
});

test('la vista previa actualiza un estado sin mutar las solicitudes originales', () => {
  const before = demoInquiries.map((item) => ({ ...item }));
  const after = advancePreviewInquiry(before, 'demo-contacto-01');
  assert.equal(before[0].status, 'nuevo');
  assert.equal(after[0].status, 'atendido');
  assert.equal(after[1], before[1]);
  assert.notEqual(after, before);
  assert.throws(() => advancePreviewInquiry(after, 'demo-contacto-04'), TypeError);
  assert.throws(() => advancePreviewInquiry(after, 'desconocido'), TypeError);
});

test('filtra por tipo y estado usando valores compatibles con la API', () => {
  const result = filterInquiries(demoInquiries, { kind: 'visita', status: 'nuevo' });
  assert.deepEqual(result.map((item) => item.id), ['demo-visita-02']);
  assert.equal(filterInquiries(demoInquiries, { status: 'archivado' }).length, 1);
});

test('busca por nombre, correo, teléfono y asunto sin depender de tildes o mayúsculas', () => {
  assert.equal(filterInquiries(demoInquiries, { query: 'CONSTRUCCION' }).length, 1);
  assert.equal(filterInquiries(demoInquiries, { query: 'referencia06@' }).length, 1);
  assert.equal(filterInquiries(demoInquiries, { query: '55550002' }).length, 1);
  assert.equal(filterInquiries(demoInquiries, { query: 'propiedad de demostracion A' }).length, 1);
});

test('pagina sin modificar el arreglo y admite una página sin resultados', () => {
  assert.equal(paginateInquiries(demoInquiries, 1, 2).length, 2);
  assert.equal(paginateInquiries(demoInquiries, 2, 2)[0].id, 'demo-contacto-03');
  assert.deepEqual(paginateInquiries(demoInquiries, 100, 2), []);
  assert.equal(demoInquiries.length, 6);
});

test('presenta fechas y reconoce fechas inválidas', () => {
  assert.notEqual(formatInquiryDate('2026-11-03', true), 'Fecha no válida');
  assert.equal(formatInquiryDate('no-es-fecha'), 'Fecha no válida');
  assert.equal(formatInquiryDate(null), 'Sin registrar');
});

test('los datos de demostración están separados de solicitudes reales', () => {
  assert.ok(demoInquiries.every((item) => item.id.startsWith('demo-')));
  assert.ok(demoInquiries.filter((item) => item.email).every((item) => item.email.endsWith('@example.com')));
});
