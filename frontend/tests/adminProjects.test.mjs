import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { adminProjectsService } from '../src/features/admin-projects/services/adminProjectsService.js';
import { canCreateProject, canEditProject, canToggleProject, canTrashProject, filterProjects, makeProjectPayload, projectDraft, validateProject, PROJECT_TRASH_ENABLED } from '../src/features/admin-projects/utils/projects.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const item = (published = false) => ({ id: 'casa', title: 'Casa', category: 'Vivienda', country: 'Guatemala', year: new Date().getFullYear(), description: 'Obra', images: ['/media/casa.jpg'], renders: [], video: '', demo: false, published });
const reply = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
test('el servicio administrativo conserva borradores en listado y detalle y envía token', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture'); calls.push(String(url));
    return reply(String(url).includes('?') ? { count: 2, page: 1, page_size: 12, results: [item(), item(true)] } : item());
  };
  assert.equal((await adminProjectsService.list({ year: 2026 }, 'fixture')).results.length, 2);
  assert.equal((await adminProjectsService.get('casa', 'fixture')).published, false);
  assert.match(calls[0], /year=2026/);
  await assert.rejects(adminProjectsService.get('../otro', 'fixture'), /Identificador/);
});
test('crear y editar envían demo false y publicación explícita sin enviar slug', async () => {
  const draft = projectDraft(item()); draft.demo = true; draft.published = true;
  const body = makeProjectPayload(draft, { canPublish: true });
  assert.equal(body.demo, false); assert.equal(body.published, true); assert.equal(body.id, undefined);
  assert.equal(makeProjectPayload(draft).published, false);
  const methods = [];
  globalThis.fetch = async (url, options) => { const sent = JSON.parse(options.body); assert.deepEqual(sent, body); methods.push(options.method); return reply(item(true)); };
  await adminProjectsService.create(body, 'token'); await adminProjectsService.update('casa', body, 'token');
  assert.deepEqual(methods, ['POST', 'PATCH']);
});
test('publicación es PATCH parcial y papelera desactivada nunca envía DELETE', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => { calls++; assert.equal(options.method, 'PATCH'); assert.deepEqual(JSON.parse(options.body), { published: false }); return reply(item()); };
  await adminProjectsService.setPublished('casa', false, 'token');
  assert.equal(PROJECT_TRASH_ENABLED, false);
  await assert.rejects(adminProjectsService.trash('casa', 'token'), /no está habilitada/);
  assert.equal(calls, 1);
});
test('valida límites de texto, año, galerías y video antes de guardar', () => {
  const draft = projectDraft(item()); assert.deepEqual(validateProject(draft), {});
  for (const [field, value] of [['title', 'x'.repeat(161)], ['category', 'x'.repeat(81)], ['country', ''], ['year', '1899'], ['year', '9999'], ['description', ' '], ['images', []], ['images', Array(41).fill('/media/x.jpg')], ['renders', ['javascript:alert(1)']], ['video', 'https://example.com/video']]) {
    assert.ok(validateProject({ ...draft, [field]: value })[field], field);
    assert.throws(() => makeProjectPayload({ ...draft, [field]: value }), TypeError);
  }
  assert.deepEqual(validateProject({ ...draft, video: 'https://youtu.be/dQw4w9WgXcQ' }), {});
  const copy = projectDraft(item()); copy.images.push('/media/otro.jpg'); assert.equal(item().images.length, 1);
});
test('permisos separan creación, edición, publicación y papelera', () => {
  const own = { permissions: ['projects.edit.own', 'projects.trash.own'] };
  assert.equal(canCreateProject(own), false); assert.equal(canEditProject(own, item()), true); assert.equal(canEditProject(own, item(true)), false);
  assert.equal(canTrashProject(own, item()), true); assert.equal(canTrashProject(own, item(true)), false);
  assert.equal(canToggleProject({ permissions: ['projects.publish'] }, item()), false);
  assert.equal(canToggleProject({ permissions: ['projects.edit.any', 'projects.publish'] }, item(true)), true);
  const admin = { permissions: ['admin.all'] };
  assert.equal(canCreateProject(admin), true); assert.equal(canEditProject(admin, item(true)), true); assert.equal(canTrashProject(admin, item(true)), true);
  assert.equal(canEditProject({ permissions: ['properties.edit.any'] }, item()), false);
});
test('rechaza contrato inválido y filtra texto solo sobre los elementos recibidos', async () => {
  globalThis.fetch = async () => reply({ count: 1, page: 1, results: [{}] });
  await assert.rejects(adminProjectsService.list({}, 'token'));
  assert.equal(filterProjects([item()], 'guatemala').length, 1); assert.equal(filterProjects([item()], 'oficina').length, 0);
});
