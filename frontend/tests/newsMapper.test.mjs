import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNews, newsImageUrl, readNewsPage } from '../src/features/news/services/newsMapper.js';
import { demoNews } from '../src/features/news/data/demoNews.js';

test('lee respuesta paginada de Django correctamente', () => {
  const result = readNewsPage({ count: 16, page: 2, page_size: 12, results: [demoNews[0]] });
  assert.equal(result.count, 16);
  assert.equal(result.page, 2);
  assert.equal(result.items[0].id, 'proximo-proyecto');
});

test('rechaza respuestas que no respetan el contrato', () => {
  assert.throws(() => readNewsPage({ data: [] }), TypeError);
});

test('mapea noticia de demostración y conserva indicador demo', () => {
  const item = normalizeNews(demoNews[1]);
  assert.equal(item.demo, true);
  assert.equal(item.category, 'Eventos');
});

test('normaliza rutas locales del mockup y URLs del Storage', () => {
  assert.equal(newsImageUrl('assets/local.jpg'), '/assets/local.jpg');
  assert.equal(newsImageUrl('https://cdn.example.com/photo.webp'), 'https://cdn.example.com/photo.webp');
  assert.equal(newsImageUrl('javascript:alert(1)'), '');
  assert.equal(newsImageUrl('//invalid.example.com'), '');
});
