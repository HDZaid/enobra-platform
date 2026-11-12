import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CACHE_MAX_AGE, CACHE_PREFIX, createCatalogCache } from '../src/services/catalogCache.js';
import {
  catalogFingerprint,
  presentWithMedia,
  snapshotItem,
  snapshotPage,
} from '../src/services/catalogSnapshot.js';
import { createOfflineResource, snapshotList } from '../src/features/projects/services/catalogOffline.js';
import { mapProject, publicProjects } from '../src/features/projects/services/projectsService.js';
import { publicProperties } from '../src/features/properties/services/propertiesService.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

const project = (id, extra = {}) => ({
  id, title: `Proyecto ${id}`, category: 'Residencial', country: 'Guatemala', year: 2026,
  description: 'Texto', images: [`https://api.test/media/r2/${id}/`], renders: [], video: '',
  demo: false, published: true, updated_at: '2026-11-01T10:00:00-06:00', ...extra,
});

function snapshot(items, extra = {}) {
  return {
    version: 1, status: 'ok', generatedAt: '2026-11-02T00:00:00Z',
    fingerprint: { projects: catalogFingerprint({ count: items.length, results: items }), properties: '0|' },
    projects: { count: items.length, pageSize: 2, items, years: [2026, 2025] },
    properties: { count: 0, pageSize: 12, items: [], facets: { zones: [], types: [], operations: [] } },
    media: {},
    ...extra,
  };
}

const snapshotFetch = (value) => async () => new Response(JSON.stringify(value), { status: 200 });

test('la caché devuelve lo guardado dentro de 7 días y lo borra al vencer', () => {
  let now = 1_000;
  const storage = memoryStorage();
  const cache = createCatalogCache({ storage, now: () => now });
  cache.write('projects:list:page=1', { count: 1 });
  assert.deepEqual(cache.read('projects:list:page=1'), { count: 1 });
  now += CACHE_MAX_AGE + 1;
  assert.equal(cache.read('projects:list:page=1'), null);
  assert.equal(storage.data.size, 0);
});

test('al iniciar se purgan entradas vencidas o corruptas sin tocar otras claves', () => {
  const storage = memoryStorage({
    [`${CACHE_PREFIX}a`]: JSON.stringify({ at: 0, data: 1 }),
    [`${CACHE_PREFIX}b`]: '{roto',
    [`${CACHE_PREFIX}c`]: JSON.stringify({ at: CACHE_MAX_AGE, data: 3 }),
    'enobra:favorites': '[1]',
  });
  const cache = createCatalogCache({ storage, now: () => CACHE_MAX_AGE + 10 });
  assert.equal(cache.read('c'), 3);
  assert.deepEqual([...storage.data.keys()].sort(), [`${CACHE_PREFIX}c`, 'enobra:favorites']);
});

test('sin almacenamiento disponible la caché no falla', () => {
  const broken = { get length() { throw new Error('bloqueado'); }, getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  for (const storage of [null, broken]) {
    const cache = createCatalogCache({ storage });
    assert.doesNotThrow(() => cache.write('k', 1));
    assert.equal(cache.read('k'), null);
  }
});

test('la copia estática se descarga una vez y una respuesta inválida (HTML del SPA) se ignora', async () => {
  let calls = 0;
  const cache = createCatalogCache({ storage: null, fetchImpl: async () => { calls += 1; return new Response('<html>', { status: 200 }); } });
  assert.equal(await cache.loadSnapshot(), null);
  await cache.loadSnapshot();
  assert.equal(calls, 1);
  await cache.loadSnapshot({ fresh: true });
  assert.equal(calls, 2);
});

test('snapshotPage arma páginas cubiertas y marca la copia incompleta', () => {
  const items = [project('a'), project('b'), project('c')];
  const value = snapshot(items);
  value.projects.count = 5; // la copia solo tiene 3 de 5
  assert.deepEqual(snapshotPage(value, 'projects', { page: 1 }).results.map((i) => i.id), ['a', 'b']);
  assert.equal(snapshotPage(value, 'projects', { page: 1 }).partial, true);
  assert.equal(snapshotPage(value, 'projects', { page: 2 }), null); // falta el elemento 4
  assert.equal(snapshotPage(value, 'projects', { page: 1, filtered: true }), null);
  assert.equal(snapshotPage({ ...value, status: 'failed' }, 'projects', { page: 1 }), null);
  assert.equal(snapshotItem(value, 'projects', 'c').id, 'c');
});

test('las imágenes copiadas reemplazan a las del backend solo si apuntan a /data/media/', () => {
  const media = { 'https://api.test/media/r2/a/': '/data/media/x.jpg', 'https://api.test/media/r2/b/': 'https://otro.test/' };
  const page = presentWithMedia({ results: [project('a'), project('b')] }, media);
  assert.equal(page.results[0].images[0], '/data/media/x.jpg');
  assert.equal(page.results[1].images[0], 'https://api.test/media/r2/b/');
});

test('el recurso público lee primero lo guardado, luego la copia, y guarda la respuesta de la API', async () => {
  const storage = memoryStorage();
  const items = [project('a'), project('b', { published: false })];
  const cache = createCatalogCache({
    storage,
    fetchImpl: snapshotFetch(snapshot(items, { media: { 'https://api.test/media/r2/a/': '/data/media/a.jpg' } })),
  });
  const resource = createOfflineResource({
    name: 'projects:list',
    cache,
    loader: async () => ({ count: 1, page: 1, page_size: 2, results: [mapProject(project('z'))] }),
    fromSnapshot: (value) => snapshotList('projects', mapProject)(value, { page: 1 }),
  });
  const fromCopy = await resource.read('page=1');
  assert.deepEqual(fromCopy.results.map((i) => i.id), ['a']); // la no publicada se descarta
  assert.equal(fromCopy.results[0].images[0], '/data/media/a.jpg');
  const fresh = await resource.load('page=1');
  assert.equal(fresh.results[0].id, 'z');
  assert.equal((await resource.read('page=1')).results[0].id, 'z');
});

test('los recursos públicos solo usan la copia para el listado sin filtros', async () => {
  const listKey = (query) => JSON.stringify({ query, invalid: false, emptyFavorites: false });
  assert.equal(typeof publicProjects.list.read, 'function');
  // Sin copia ni caché en Node, todo devuelve null sin lanzar errores.
  assert.equal(await publicProjects.list.read('year=2025&page=1'), null);
  assert.equal(await publicProperties.list.read(listKey({ sort: 'recent', page: 1, zone: 'Zona 10' })), null);
  assert.equal(await publicProperties.detail.read('7'), null);
});
