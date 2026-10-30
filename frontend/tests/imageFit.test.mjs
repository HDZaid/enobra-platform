import assert from 'node:assert/strict';
import test from 'node:test';
import { imageFit } from '../src/components/ui/imageFit.js';
import { serviceIconName } from '../src/features/services/utils/serviceIcons.js';

test('encuadres similares cubren sin deformar; proporciones extremas conservan la imagen completa', () => {
  assert.equal(imageFit(1600, 900, 1440, 810).objectFit, 'cover');
  assert.equal(imageFit(900, 1600, 1440, 810).objectFit, 'contain');
  assert.equal(imageFit(3000, 600, 390, 600).objectFit, 'contain');
  assert.equal(imageFit(900, 1200, 600, 800).objectPosition, 'center top');
  assert.equal(imageFit(0, 0, 100, 100).objectFit, 'cover');
  assert.equal(imageFit(NaN, 1, 100, 100).objectPosition, 'center');
});
test('iconos corresponden a servicios y ofrecen alternativa para contenido nuevo', () => {
  assert.equal(serviceIconName('Diseño eléctrico'), 'Zap');
  assert.equal(serviceIconName('Diseño sanitario'), 'Droplets');
  assert.equal(serviceIconName('Topografía'), 'MapPinned');
  assert.equal(serviceIconName('Servicio nuevo'), 'ClipboardCheck');
});
