import assert from 'node:assert/strict';
import test from 'node:test';
import { displayAdminCount, inquiryStatuses, readAdminCollection, readAdminSession, validInquiryStatus } from '../src/features/admin/utils/adminData.js';

test('valida el contrato de autenticación y el rol administrador', () => {
  const result = readAdminSession({ access: 'token', refresh: 'refresh', user: { id: '1', name: 'Admin', role: 'admin', email: 'admin@example.com' } });
  assert.equal(result.user.name, 'Admin');
  assert.equal(result.user.role, 'admin');
  assert.throws(() => readAdminSession({ access: 'token', refresh: 'refresh', user: { role: 'editor' } }), TypeError);
  assert.throws(() => readAdminSession({ user: { role: 'admin' } }), TypeError);
});

test('lee colecciones paginadas de Django sin inventar datos', () => {
  const list = readAdminCollection({ count: 2, results: [{ id: '1' }] });
  assert.equal(list.items.length, 1);
  assert.equal(list.count, 2);
  assert.throws(() => readAdminCollection({ count: 4, data: [] }), TypeError);
});

test('los contadores faltantes no se presentan como cero', () => {
  assert.equal(displayAdminCount(undefined), '—');
  assert.equal(displayAdminCount(0), '0');
  assert.equal(displayAdminCount(17), '17');
  assert.equal(displayAdminCount(-1), '—');
});

test('los estados de solicitudes coinciden con el contrato de Django', () => {
  assert.deepEqual(Object.keys(inquiryStatuses), ['nuevo', 'atendido', 'archivado']);
  assert.equal(validInquiryStatus('nuevo'), true);
  assert.equal(validInquiryStatus('done'), false);
});
