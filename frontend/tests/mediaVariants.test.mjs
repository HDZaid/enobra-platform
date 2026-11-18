import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEDIA_SIZES, sizedMediaUrl } from '../src/services/mediaVariants.js';

const id = 'a'.repeat(32);

test('pide la versión reducida de las imágenes de R2', () => {
  assert.equal(sizedMediaUrl(`/media/r2/${id}/`, MEDIA_SIZES.card), `/media/r2/${id}/?w=800`);
  assert.equal(
    sizedMediaUrl(`https://enobra-api.onrender.com/media/r2/${id}/`, MEDIA_SIZES.full),
    `https://enobra-api.onrender.com/media/r2/${id}/?w=1920`,
  );
});

test('conserva la vista previa firmada y reemplaza un tamaño anterior', () => {
  const preview = `https://api.example.test/media/r2/${id}/?preview=abc%3Ade`;
  assert.equal(sizedMediaUrl(preview, 800), `${preview}&w=800`);
  assert.equal(sizedMediaUrl(`/media/r2/${id}/?w=800`, 1920), `/media/r2/${id}/?w=1920`);
});

test('no toca otras URL ni tamaños no admitidos', () => {
  for (const src of ['/assets/enobra/casa.jpg', '/data/media/abc.webp', '/media/uploads/foto.png', 'https://cdn.example.com/render.webp', '', null, undefined])
    assert.equal(sizedMediaUrl(src, 800), src);
  assert.equal(sizedMediaUrl(`/media/r2/${id}/`, 640), `/media/r2/${id}/`);
  assert.equal(sizedMediaUrl(`/media/r2/${id}/`), `/media/r2/${id}/`);
});
