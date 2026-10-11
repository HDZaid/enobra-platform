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


test('acepta rutas relativas del backend y no depende del proveedor de Storage', () => {
  assert.equal(newsImageUrl('/media/noticias/obra.webp'), '/media/noticias/obra.webp');
  assert.equal(newsImageUrl(' /media/noticias/obra.webp '), '/media/noticias/obra.webp');
  assert.equal(newsImageUrl('http://127.0.0.1:8000/media/obra.jpg'), 'http://127.0.0.1:8000/media/obra.jpg');
  assert.equal(newsImageUrl('https://cdn.example.com/photo.webp?token=abc'), 'https://cdn.example.com/photo.webp?token=abc');
});

test('evita formatos de URL inválidos para imágenes remotas', () => {
  assert.equal(newsImageUrl(null), '');
  assert.equal(newsImageUrl('data:image/svg+xml;base64,AAA'), '');
  assert.equal(newsImageUrl('javascript:alert(1)'), '');
  assert.equal(newsImageUrl('https://user:password@example.com/image.webp'), '');
  assert.equal(newsImageUrl('https://'), '');
  assert.equal(newsImageUrl('\\\\evil.test/path.jpg'), '');
});

test('una imagen no definida se normaliza sin convertirse en texto', () => {
  assert.equal(normalizeNews({ id: 'prueba', title: 'Prueba', image: null }).image, '');
});
