import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogFingerprint } from '../src/services/catalogSnapshot.js';
import { compareLanding, landingMessage } from '../src/features/admin/utils/landingStatus.js';

const project = (id, extra = {}) => ({ id, published: true, updated_at: '2026-11-01T10:00:00-06:00', ...extra });
const snapshot = (items) => ({
  version: 1, status: 'ok', generatedAt: '2026-11-02T00:00:00Z',
  fingerprint: { projects: catalogFingerprint({ count: items.length, results: items }), properties: '0|' },
});

test('compareLanding detecta copias desactualizadas, en curso y fallidas', () => {
  const live = { projects: { count: 2, results: [project('a'), project('b', { updated_at: '2026-11-05T10:00:00-06:00' })] }, properties: { count: 0, results: [] } };
  const base = snapshot([project('a')]);
  assert.equal(compareLanding(null, live).state, 'missing');
  assert.equal(compareLanding({ ...base, status: 'failed' }, live).state, 'failed');
  const changed = compareLanding(base, live, Date.parse('2026-11-05T16:05:00Z'));
  assert.equal(changed.state, 'updating');
  assert.deepEqual(changed.kinds, ['Proyectos']);
  assert.equal(compareLanding(base, live, Date.parse('2026-11-06T00:00:00Z')).state, 'stale');
  const same = { ...base, fingerprint: { projects: catalogFingerprint(live.projects), properties: '0|' } };
  assert.equal(compareLanding(same, live).state, 'ok');
  assert.match(landingMessage(compareLanding({ ...base, status: 'failed' }, live)), /no se está actualizando/);
});
