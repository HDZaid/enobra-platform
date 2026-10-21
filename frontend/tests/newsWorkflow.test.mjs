import assert from 'node:assert/strict';
import test from 'node:test';
import { newsDraftHasChanges, newsPreviewContent, filterNewsByPublication, formatNewsDate } from '../src/features/admin/utils/newsWorkflow.js';

const original = { title: 'Noticia', category: 'Eventos', date: '2026-10-20', description: 'Texto', image: '/media/foto.jpg', published: false, demo: false };

test('detecta cambios de texto, publicación y archivo sin alterar el borrador', () => {
  assert.equal(newsDraftHasChanges(original, { ...original }), false);
  assert.equal(newsDraftHasChanges(original, { ...original, title: 'Otra' }), true);
  assert.equal(newsDraftHasChanges(original, { ...original, published: true }), true);
  assert.equal(newsDraftHasChanges(original, { ...original }, { name: 'foto.jpg' }), true);
  assert.equal(original.title, 'Noticia');
});

test('prepara una vista previa editorial sin generar HTML', () => {
  const preview = newsPreviewContent({ ...original, title: '  Nuevo proyecto  ', description: '  Hola\nMundo  ' }, '/media/nueva.jpg');
  assert.equal(preview.title, 'Nuevo proyecto');
  assert.equal(preview.description, 'Hola\nMundo');
  assert.equal(preview.image, '/media/nueva.jpg');
  assert.equal(newsPreviewContent({}).title, 'Título de la publicación');
  assert.equal(newsPreviewContent({}).description, 'Aquí aparecerá el contenido de la noticia.');
});

test('filtra el estado de publicación sin cambiar los datos de origen', () => {
  const rows = [{ id: 'a', published: true }, { id: 'b', published: false }, { id: 'c', published: true }];
  assert.deepEqual(filterNewsByPublication(rows, 'published').map((x) => x.id), ['a', 'c']);
  assert.deepEqual(filterNewsByPublication(rows, 'draft').map((x) => x.id), ['b']);
  assert.equal(filterNewsByPublication(rows, 'all'), rows);
  assert.equal(rows.length, 3);
});

test('presenta fechas locales sin desplazar el día por zona horaria', () => {
  assert.match(formatNewsDate('2026-10-20'), /20/);
  assert.equal(formatNewsDate('2026-02-30'), 'Fecha por definir');
  assert.equal(formatNewsDate(''), 'Fecha por definir');
});
