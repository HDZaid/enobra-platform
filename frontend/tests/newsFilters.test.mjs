import assert from 'node:assert/strict';
import test from 'node:test';
import { NEWS_CATEGORIES, nextNewsQuery, paginateDemoNews, validNewsCategory } from '../src/features/news/utils/newsFilters.js';
import { togglePreviewNewsPublished } from '../src/features/admin/utils/newsEditor.js';

test('categorías públicas idénticas al contrato Django', () => {
  assert.deepEqual(NEWS_CATEGORIES, ['Anuncios', 'Eventos', 'Proyectos']);
  assert.equal(validNewsCategory('Eventos'), 'Eventos');
  assert.equal(validNewsCategory('cualquiera'), '');
});

test('la paginación de ejemplo filtra antes de paginar y cuenta correctamente', () => {
  const data = [
    { id: '1', category: 'Eventos' }, { id: '2', category: 'Anuncios' },
    { id: '3', category: 'Eventos' }, { id: '4', category: 'Eventos' },
  ];
  const result = paginateDemoNews(data, { category: 'Eventos', page: 2, pageSize: 2 });
  assert.equal(result.count, 3);
  assert.deepEqual(result.items.map((entry) => entry.id), ['4']);
  assert.equal(data.length, 4);
});

test('al cambiar categoría reinicia la página y conserva otros parámetros', () => {
  const previous = new URLSearchParams('page=4&category=Eventos&origen=home');
  const next = nextNewsQuery(previous, { category: 'Proyectos' });
  assert.equal(next.get('category'), 'Proyectos');
  assert.equal(next.has('page'), false);
  assert.equal(next.get('origen'), 'home');
  assert.equal(previous.get('page'), '4');
});

test('cambiar página mantiene categoría y elimina page al volver a la primera', () => {
  const params = new URLSearchParams('category=Eventos');
  assert.equal(nextNewsQuery(params, { page: 3 }).get('page'), '3');
  assert.equal(nextNewsQuery(params, { page: 1 }).has('page'), false);
  assert.equal(nextNewsQuery(params, { page: 3 }).get('category'), 'Eventos');
});

test('publicar o retirar una noticia de ejemplo es inmutable', () => {
  const original = [{ id: 'a', published: false }, { id: 'b', published: true }];
  const changed = togglePreviewNewsPublished(original, 'a');
  assert.equal(changed[0].published, true);
  assert.equal(changed[1], original[1]);
  assert.equal(original[0].published, false);
  assert.equal(togglePreviewNewsPublished(changed, 'a')[0].published, false);
});
