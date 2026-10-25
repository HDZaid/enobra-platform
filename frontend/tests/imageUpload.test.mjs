import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageUploadQueue, imageSlots, MAX_IMAGE_BYTES, moveImage, validateImageFile, validUploadedImageUrl } from '../src/components/ui/imageUpload.js';
import { uploadMedia } from '../src/services/uploadClient.js';
import { describeApiError } from '../src/components/ui/apiErrors.js';

const file = (type = 'image/jpeg', size = 10) => ({ name: 'foto.jpg', type, size });
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('valida los cuatro formatos y el límite inclusivo de 10 MB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) assert.equal(validateImageFile(file(type, MAX_IMAGE_BYTES)), null);
  for (const value of [null, file('image/svg+xml'), file('text/plain'), file('', 10), file('image/png', 0), file('image/png', NaN), file('image/png', MAX_IMAGE_BYTES + 1)]) assert.equal(typeof validateImageFile(value), 'string');
});

test('solo acepta referencias HTTPS o rutas de medios sin credenciales ni escapes', () => {
  for (const url of ['https://example.com/photo.jpg?x=1', '/media/photos/foto-1.webp']) assert.equal(validUploadedImageUrl(url), true);
  for (const url of [null, '', '/media/', '/media/../private', '/media/%2e%2e/private', '//example.com/a', 'http://example.com/a', 'javascript:alert(1)', 'data:image/png;base64,abc', 'https://user:pass@example.com/a', 'https://example.com\\a', 'https://example.com/\na']) assert.equal(validUploadedImageUrl(url), false, String(url));
});

test('reordenar cambia la portada sin mutar y tolera límites inválidos', () => {
  const images = ['a', 'b', 'c'];
  assert.deepEqual(moveImage(images, 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveImage(images, 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveImage(images, 0, -1), images);
  assert.deepEqual(moveImage(images, 3, 0), images);
  assert.deepEqual(images, ['a', 'b', 'c']);
});

test('las reservas incluyen subidas pendientes, fallidas y canceladas', () => {
  assert.equal(imageSlots(40, 37, 2), 1);
  assert.equal(imageSlots(2, 1, 1), 0);
  assert.equal(imageSlots(2, 3, 1), 0);
  assert.equal(imageSlots(0, 0), 0);
});

test('cola: tres simultáneas, éxito fuera de orden, error aislado y reintento', async () => {
  const requests = [];
  const results = [];
  let snapshot;
  let busy;
  const queue = createImageUploadQueue((file, options) => new Promise((resolve, reject) => requests.push({ file, options, resolve, reject })), {
    onUpdate: (jobs, working) => { snapshot = jobs; busy = working; }, onUploaded: (value) => results.push(value),
  });
  queue.add([file(), file(), file(), file(), file()]);
  await tick();
  assert.equal(requests.length, 3);
  assert.equal(busy, true);
  requests[1].options.onProgress(50);
  assert.equal(snapshot[1].progress, 50);
  requests[1].resolve({ url: '/media/b.jpg' });
  requests[0].reject({ status: 501 });
  await tick();
  assert.equal(requests.length, 5);
  assert.equal(snapshot.find((job) => job.id === 1).status, 'error');
  queue.retry(1);
  assert.equal(requests.length, 5);
  requests[2].resolve({ url: '/media/c.jpg' });
  await tick();
  assert.equal(requests.length, 6);
  for (const request of requests.slice(3)) request.resolve({ url: '/media/ok.jpg' });
  await tick();
  assert.equal(results.length, 5);
  assert.equal(queue.count(), 0);
  assert.equal(busy, false);
  queue.dispose();
});

test('cancelar y quitar ignoran éxitos tardíos; dispose aborta sin notificar', async () => {
  const requests = [];
  const results = [];
  let updates = 0;
  const queue = createImageUploadQueue((file, options) => new Promise((resolve) => requests.push({ options, resolve })), {
    onUpdate: () => { updates += 1; }, onUploaded: (value) => results.push(value),
  });
  queue.add([file(), file(), file(), file()]);
  queue.cancel(4); // Aún en espera: no debe iniciar una solicitud.
  await tick();
  queue.cancel(1);
  queue.remove(2);
  assert.equal(requests[0].options.signal.aborted, true);
  assert.equal(requests[1].options.signal.aborted, true);
  requests[0].resolve({ url: '/media/late.jpg' });
  requests[1].resolve({ url: '/media/late.jpg' });
  await tick();
  assert.deepEqual(results, []);
  assert.equal(requests.length, 3);
  queue.retry(1);
  await tick();
  assert.equal(requests.length, 4);
  queue.dispose();
  const before = updates;
  requests[2].resolve({ url: '/media/late.jpg' });
  requests[3].resolve({ url: '/media/late.jpg' });
  await tick();
  assert.equal(requests[2].options.signal.aborted, true);
  assert.equal(updates, before);
  assert.deepEqual(results, []);
});

class FakeXHR {
  static instances = [];
  constructor() { this.upload = {}; this.headers = {}; FakeXHR.instances.push(this); }
  open(method, url) { this.method = method; this.url = url; }
  setRequestHeader(key, value) { this.headers[key] = value; }
  send(body) { this.body = body; }
  abort() { this.onabort?.(); }
  respond(status, payload) { this.status = status; this.responseText = typeof payload === 'string' ? payload : JSON.stringify(payload); this.onload?.(); }
}

test('XHR: multipart, Bearer, progreso, respuesta 201 y URL validada', async (t) => {
  t.mock.method(globalThis, 'XMLHttpRequest', FakeXHR); // definido abajo para Node
  const image = new Blob(['imagen'], { type: 'image/png' });
  const progress = [];
  const pending = uploadMedia(image, { kind: 'render', token: 'test-only', onProgress: (value) => progress.push(value) });
  const xhr = FakeXHR.instances.at(-1);
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.url, '/api/v1/admin/media/');
  assert.equal(xhr.headers.Authorization, 'Bearer test-only');
  assert.equal(xhr.headers['Content-Type'], undefined);
  assert.equal(xhr.body.get('kind'), 'render');
  assert.equal(xhr.body.get('file').size, image.size);
  xhr.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
  assert.deepEqual(progress, [50]);
  xhr.respond(201, { id: '1', url: '/media/ok.png' });
  assert.deepEqual(await pending, { id: '1', url: '/media/ok.png' });
});

// Node no tiene XMLHttpRequest; restaurar su estado original al finalizar el archivo.
const originalXHR = globalThis.XMLHttpRequest;
globalThis.XMLHttpRequest = FakeXHR;
test.after(() => { if (originalXHR === undefined) delete globalThis.XMLHttpRequest; else globalThis.XMLHttpRequest = originalXHR; });

test('XHR: los errores HTTP por archivo conservan status y mensaje de UI', async () => {
  for (const [status, message] of [[401, /sesión venció/], [403, /Sin permiso/], [429, /Demasiados intentos/], [413, /demasiado grande/], [501, /aún no disponible/]]) {
    const pending = uploadMedia(new Blob(['x'], { type: 'image/png' }));
    FakeXHR.instances.at(-1).respond(status, { error: { code: 'test', details: { file: ['Error'] } } });
    await assert.rejects(pending, (error) => {
      assert.equal(error.status, status);
      assert.match(describeApiError(error), message);
      assert.deepEqual(error.details, { file: ['Error'] });
      return true;
    });
  }
});

test('XHR: rechaza HTML, URL insegura, éxito distinto de 201 y fallo de red', async () => {
  for (const [status, payload] of [[201, '<html>Error</html>'], [201, { id: '1', url: 'http://example.com/a' }], [200, { id: '1', url: '/media/a' }]]) {
    const pending = uploadMedia(new Blob(['x'], { type: 'image/png' }));
    FakeXHR.instances.at(-1).respond(status, payload);
    await assert.rejects(pending);
  }
  const pending = uploadMedia(new Blob(['x'], { type: 'image/png' }));
  FakeXHR.instances.at(-1).onerror();
  await assert.rejects(pending, (error) => error.code === 'network_error');
});

test('XHR: cancelación previa/durante y archivo inválido no generan éxito', async () => {
  const image = new Blob(['x'], { type: 'image/png' });
  const controller = new AbortController();
  const pending = uploadMedia(image, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  const before = FakeXHR.instances.length;
  await assert.rejects(uploadMedia(image, { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(uploadMedia(new Blob(['x'], { type: 'text/plain' })), { status: 400 });
  assert.equal(FakeXHR.instances.length, before);
});
