import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validNewsImageReference, validateNewsDraft, validateNewsFile,
  makeNewsPayload, upsertPreviewNews, removePreviewNews, adminNewsImageSrc,
} from '../src/features/admin/utils/newsEditor.js';

const valid = {
  title: '  Nueva sede  ', category: 'Anuncios', date: '2026-10-20',
  description: '  Avances del proyecto  ', image: '/media/noticias/foto.jpg', demo: false, published: true,
};

test('acepta URL HTTPS y /media/ que permite el contrato de Django', () => {
  assert.equal(validNewsImageReference('https://cdn.example.com/a.png'), true);
  assert.equal(validNewsImageReference('/media/noticias/a.jpg'), true);
  assert.equal(validNewsImageReference('http://example.com/a.png'), false);
  assert.equal(validNewsImageReference('javascript:alert(1)'), false);
  assert.equal(validNewsImageReference('/media/../secreto.jpg'), false);
});

test('las imágenes locales y data URI solo son válidas en la vista previa', () => {
  assert.equal(validNewsImageReference('/assets/estructura.jpg'), false);
  assert.equal(validNewsImageReference('/assets/estructura.jpg', { preview: true }), true);
  assert.equal(validNewsImageReference('data:image/png;base64,AA=='), false);
  assert.equal(validNewsImageReference('data:image/png;base64,AA==', { preview: true }), true);
  assert.equal(adminNewsImageSrc('data:image/png;base64,AA==', true), 'data:image/png;base64,AA==');
});

test('valida título, categoría, fecha y descripción sin aceptar fechas inexistentes', () => {
  const errors = validateNewsDraft({ ...valid, title: '', category: 'Inventada', date: '2026-02-30', description: ' ' });
  assert.deepEqual(Object.keys(errors).sort(), ['category', 'date', 'description', 'title']);
});

test('exige imagen y valida tipos y tamaños de archivo', () => {
  assert.ok(validateNewsDraft({ ...valid, image: '' }).image);
  assert.equal(validateNewsFile({ type: 'image/webp', size: 300_000 }), '');
  assert.ok(validateNewsFile({ type: 'application/pdf', size: 500 }).length > 0);
  assert.ok(validateNewsFile({ type: 'image/png', size: 11 * 1024 * 1024 }).length > 0);
});

test('construye el JSON de noticias sin propiedades ajenas al contrato', () => {
  assert.deepEqual(makeNewsPayload(valid, valid.image), {
    title: 'Nueva sede', category: 'Anuncios', date: '2026-10-20',
    description: 'Avances del proyecto', image: '/media/noticias/foto.jpg',
    demo: false, published: true,
  });
  assert.throws(() => makeNewsPayload(valid, 'data:image/png;base64,AA=='), TypeError);
});

test('crear, editar y borrar ejemplos es inmutable y no altera los datos originales', () => {
  const original = [{ id: 'uno', title: 'Anterior' }];
  const created = upsertPreviewNews(original, { id: 'dos', title: 'Nueva' });
  assert.equal(created.length, 2);
  const edited = upsertPreviewNews(created, { id: 'uno', title: 'Actualizada' });
  assert.equal(edited.find((item) => item.id === 'uno').title, 'Actualizada');
  const removed = removePreviewNews(edited, 'dos');
  assert.equal(removed.length, 1);
  assert.equal(original[0].title, 'Anterior');
});
