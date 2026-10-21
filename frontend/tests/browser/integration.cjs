// Integration checks use intercepted API fixtures; no real login, write or upload is performed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  const errors = [],
    calls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const project = {
    id: 'casa-patio',
    title: 'Casa patio',
    category: 'Vivienda',
    country: 'Guatemala',
    year: 2026,
    description: 'Descripción de prueba',
    images: ['/media/casa.jpg'],
    renders: [],
    video: '',
    published: true,
    demo: true,
  };
  const property = {
    ...project,
    id: 1,
    title: 'Casa en venta',
    operation: 'Venta',
    type: 'Casa',
    zone: 'Zona 9',
    location: 'Quetzaltenango',
    price: 950000,
    rooms: 3,
    baths: 2,
    parking: 2,
    area: 190,
    date: '2026-10-12',
    commercial: 'Condiciones',
  };
  const news = {
    id: 'proximo-proyecto',
    title: 'Noticia de prueba',
    category: 'Anuncios',
    date: '2026-09-01',
    description: 'Contenido de prueba',
    image: '/assets/estructura.jpg',
    demo: true,
    published: true,
  };
  let mode = 'ready',
    role = 'ingeniero',
    loginFails = false;
  const collection = (results) => ({ count: results.length, page: 1, page_size: 12, results });
  await page.route('**/media/**', (r) => r.fulfill({ status: 404, body: '' }));
  await page.route('**/api/v1/**', async (r) => {
    const req = r.request(),
      u = new URL(req.url()),
      p = u.pathname.replace('/api/v1/', '');
    calls.push({
      p,
      method: req.method(),
      query: u.search,
      auth: req.headers().authorization,
      body: req.postData(),
    });
    const reply = (body, status = 200) =>
      r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (mode === 'error' && (p.startsWith('properties/') || p.startsWith('projects/')))
      return reply({ error: { code: 'not_implemented', message: 'No disponible' } }, 501);
    if (p === 'auth/login/')
      return loginFails
        ? reply({ error: { code: 'not_authenticated', message: 'Error' } }, 401)
        : reply({
            access: 'test-access',
            refresh: 'test-refresh',
            expires_in: 3600,
            user: {
              id: 1,
              name: 'Cuenta de prueba',
              email: 'test@example.com',
              role,
              roles: [role],
              permissions: role === 'ingeniero' ? ['admin.all'] : ['properties.create'],
            },
          });
    if (p === 'auth/logout/') return r.fulfill({ status: 204 });
    if (p === 'inquiries/contact/' || p === 'inquiries/visits/')
      return reply({ id: '1', status: 'nuevo', created_at: '2026-10-20T12:00:00Z' }, 201);
    if (p === 'projects/years/') return reply({ years: [2026] });
    if (p === 'projects/') return reply(collection(mode === 'empty' ? [] : [project]));
    if (p === 'projects/casa-patio/') return reply(project);
    if (p === 'properties/facets/')
      return reply({
        operations: ['Venta', 'Alquiler'],
        types: ['Casa'],
        zones: ['Zona 9'],
        min_price: 0,
        max_price: 1000000,
      });
    if (p === 'properties/') return reply(collection(mode === 'empty' ? [] : [property]));
    if (p === 'properties/1/') return reply(property);
    if (p === 'news/') return reply(collection([news]));
    if (p === 'news/proximo-proyecto/') return reply(news);
    if (p === 'inquiries/') return reply(collection([]));
    return reply(
      { error: { code: 'not_implemented', message: 'Contrato sin datos' } },
      p.includes('missing') ? 404 : 501,
    );
  });
  async function go(path) {
    await page.goto('http://127.0.0.1:5173' + path);
    await page.locator('main').waitFor();
    await page.waitForTimeout(150);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/nosotros',
      '/servicios',
      '/noticias',
      '/noticias/proximo-proyecto',
      '/contacto',
      '/proyectos',
      '/proyectos/casa-patio',
      '/bienes-raices',
      '/bienes-raices/1',
      '/admin/login',
      '/ruta-inexistente',
    ]) {
      await go(path);
      const state = await page.evaluate(() => ({
        main: document.querySelectorAll('main').length,
        duplicateIds: [...document.querySelectorAll('[id]')]
          .map((x) => x.id)
          .filter((id, i, a) => a.indexOf(id) !== i),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      assert.equal(state.main, 1, path);
      assert.deepEqual(state.duplicateIds, [], path);
      assert.equal(state.overflow, false, path);
      assert.equal(await page.getByText('Unexpected Application Error!').count(), 0);
      if (path === '/noticias') assert.equal(await page.title(), 'Noticias y eventos | EnObra');
      if (path === '/contacto') assert.equal(await page.title(), 'Contacto | EnObra');
      console.log('PASS responsive route', width, path);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await go('/proyectos');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('projects/?year=2026')),
    page.getByLabel('Año del proyecto').selectOption('2026'),
  ]);
  await page.waitForURL('**/proyectos?year=2026');
  assert(calls.some((c) => c.p === 'projects/' && c.query.includes('year=2026')));
  await go('/noticias');
  await page.getByLabel('Filtrar noticias por categoría').selectOption('Eventos');
  await page.waitForURL('**/noticias?category=Eventos');
  await go('/contacto');
  await page.locator('#contact-name').fill('Persona de prueba');
  await page.locator('#contact-email').fill('test@example.com');
  await page.locator('#contact-phone').fill('5555-1234');
  await page.locator('#contact-message').fill('Solicitud de prueba');
  await page.locator('form button[type=submit]').click();
  await page
    .getByText(/solicitud fue recibida/i)
    .first()
    .waitFor();
  assert(
    calls.some((c) => c.p === 'inquiries/contact/' && JSON.parse(c.body).phone === '55551234'),
  );
  await go('/bienes-raices/1');
  await page.getByRole('button', { name: /Solicitar visita/ }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  for (const path of ['/proyectos', '/bienes-raices']) {
    mode = 'empty';
    await go(path);
    await page
      .getByText(/No hay proyectos|No encontramos|No hay propiedades|Sin resultados/i)
      .first()
      .waitFor();
    console.log('PASS empty', path);
  }
  mode = 'error';
  await go('/proyectos');
  await page.getByText('No pudimos cargar la información').waitFor();
  mode = 'ready';
  await page.locator('#main').getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByText('Casa patio', { exact: true }).first().waitFor();
  await go('/proyectos/missing');
  await page.getByText('Proyecto no encontrado', { exact: true }).waitFor();
  await go('/admin/noticias');
  await page.waitForURL('**/admin/login');
  loginFails = true;
  await page.locator('#admin-email').fill('test@example.com');
  await page.locator('#admin-password').fill('test-only');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' }).waitFor();
  loginFails = false;
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: 'Gestionar noticias' }).click();
  await page.getByRole('button', { name: 'Añadir noticia' }).waitFor();
  await page.getByRole('button', { name: 'Añadir noticia' }).click();
  await page.getByRole('dialog').waitFor();
  await page.locator('#news-title').fill('Noticia integrada');
  await page.locator('#news-date').fill('2026-10-20');
  await page.locator('#news-description').fill('Contenido de prueba de integración');
  await page.getByLabel('Referencia de imagen').fill('/media/prueba.jpg');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText('Noticia creada en Django.', { exact: true }).waitFor();
  assert(
    calls.some(
      (c) =>
        c.p === 'news/' &&
        c.method === 'POST' &&
        c.auth === 'Bearer test-access' &&
        JSON.parse(c.body).published === false,
    ),
  );
  await page.getByRole('link', { name: 'Mensajes', exact: true }).click();
  await page.waitForURL('**/admin/mensajes');
  assert(calls.some((c) => c.p === 'inquiries/' && c.auth === 'Bearer test-access'));
  await page.getByRole('button', { name: 'Salir del panel' }).click();
  await page.waitForURL('**/admin/login');
  role = 'arquitecta';
  await page.locator('#admin-email').fill('test@example.com');
  await page.locator('#admin-password').fill('test-only');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.waitForURL('**/admin');
  assert.equal(await page.getByRole('link', { name: 'Noticias', exact: true }).count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Mensajes', exact: true }).count(), 0);
  await page.evaluate(() => {
    history.pushState({}, '', '/admin/noticias');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await page
    .getByRole('alert')
    .filter({ hasText: 'Esta sección no está disponible para tu rol' })
    .waitFor();
  console.log(
    'PASS filters, contact payload, visit dialog, empty/error/retry/404, login errors, admin editor/inbox navigation and RBAC',
  );
  assert.deepEqual(errors, []);
  console.log('PASS no uncaught JavaScript errors');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
