import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { companyService } from '../src/components/layout/services/companyService.js';
import { institutionService } from '../src/features/about/services/institutionService.js';
import { servicesService } from '../src/features/services/services/servicesService.js';
import { reference as company } from '../src/components/layout/data/reference.js';
import { reference as institution } from '../src/features/about/data/reference.js';
import { reference as services } from '../src/features/services/data/reference.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

test('los cuatro endpoints de Leo respetan los contratos y propagan AbortSignal', async () => {
  const controller = new AbortController();
  for (const [loader, payload, path] of [
    [companyService.get, company, 'company/'],
    [institutionService.get, institution, 'institution/'],
    [servicesService.list, services, 'services/'],
    [
      (options) => servicesService.get('diseño especial', options),
      services[0],
      'services/dise%C3%B1o%20especial/',
    ],
  ]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `/api/v1/${path}`);
      assert.equal(options.method, 'GET');
      assert.equal(options.signal, controller.signal);
      assert.equal(options.headers.Authorization, undefined);
      return json(payload);
    };
    assert.deepEqual(await loader({ signal: controller.signal }), payload);
  }
});

test('501 se propaga sin presentar contenido de referencia como respuesta del servidor', async () => {
  globalThis.fetch = async () =>
    json({ error: { code: 'not_implemented', message: 'Pendiente de persistencia' } }, 501);
  for (const loader of [companyService.get, institutionService.get, servicesService.list]) {
    await assert.rejects(
      loader(),
      (error) => error.status === 501 && error.code === 'not_implemented',
    );
  }
});

test('rechaza contratos incompletos y respuestas HTML de un proxy mal configurado', async () => {
  for (const payload of ['<!doctype html>', {}, null, { results: services }]) {
    globalThis.fetch = async () => json(payload);
    for (const loader of [companyService.get, institutionService.get, servicesService.list]) {
      await assert.rejects(loader(), /contrato de contenido/);
    }
  }
});

test('un catálogo vacío válido no se sustituye por servicios de demostración', async () => {
  globalThis.fetch = async () => json([]);
  assert.deepEqual(await servicesService.list(), []);
});

test('una historia vacía conserva referencia sin borrar los demás datos válidos', async () => {
  for (const presentation of [[], [''], ['  ', '\n']]) {
    globalThis.fetch = async () => json({ ...institution, mission: 'Misión real.', presentation });
    const result = await institutionService.get();
    assert.deepEqual(result.presentation, institution.presentation);
    assert.equal(result.mission, 'Misión real.');
  }
  const content = { ...institution, presentation: ['Historia real de la empresa.'] };
  globalThis.fetch = async () => json(content);
  assert.deepEqual(await institutionService.get(), content);
});

test('contacto y pie conservan campos publicados cuando company llega parcialmente vacío', async () => {
  globalThis.fetch = async () => json({ ...company, name: '  ', person: '', address: '', phones: [' ', ''], whatsapp: '', email: '' });
  assert.deepEqual(await companyService.get(), company);
  const real = { ...company, name: 'Nombre real', address: 'Dirección real', phones: ['55551234'], whatsapp: '50255551234', email: 'contacto@example.test' };
  globalThis.fetch = async () => json(real);
  assert.deepEqual(await companyService.get(), real);
});
test('Nosotros recupera misión, visión y principios vacíos sin sustituir la historia real', async () => {
  globalThis.fetch = async () => json({ ...institution, presentation: ['Historia real.'], mission: ' ', vision: '', principles: [{ title: '', description: ' ' }] });
  assert.deepEqual(await institutionService.get(), { ...institution, presentation: ['Historia real.'] });
});
test('un servicio sin texto obligatorio se rechaza, un catálogo sin servicios sigue vacío', async () => {
  globalThis.fetch = async () => json([{ ...services[0], title: ' ' }]);
  await assert.rejects(servicesService.list(), /contrato de contenido/);
  globalThis.fetch = async () => json([]);
  assert.deepEqual(await servicesService.list(), []);
});
