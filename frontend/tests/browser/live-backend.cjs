// No request interception: browser -> Vite proxy -> Django -> disposable SQLite/files.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const baseURL = process.env.INTEGRATION_BASE_URL;
  assert(
    baseURL && process.env.INTEGRATION_PASSWORD,
    'Use backend/scripts/verify_frontend_integration.py',
  );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const api = page.request;
    const health = await api.get('/api/v1/health/');
    assert.equal(health.status(), 200);
    assert.equal((await health.json()).status, 'ok');
    await page.goto('/');
    await page
      .locator('#home-news')
      .getByText('Noticia pública de integración', { exact: true })
      .waitFor();
    assert.equal(await page.locator('#home-news').getByText('Borrador privado').count(), 0);
    await page.goto('/nosotros');
    await page.getByText('Presentación institucional desde Django.', { exact: true }).waitFor();
    await page.goto('/contacto');
    await page.locator('main').getByText('Responsable de integración', { exact: true }).waitFor();
    await page.locator('main').getByText('contacto@example.test', { exact: true }).waitFor();
    await page.locator('#contact-name').fill('Visitante integrado');
    await page.locator('#contact-email').fill('visitante@example.test');
    await page.locator('#contact-phone').fill('5555-1234');
    await page.locator('#contact-message').fill('Mensaje guardado desde React en Django.');
    const [contactResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/inquiries/contact/') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Enviar/ }).click(),
    ]);
    assert.equal(contactResponse.status(), 201);
    const receipt = await contactResponse.json();
    await page.getByText('Tu solicitud fue recibida correctamente.', { exact: true }).waitFor();
    console.log('PASS company/institution/news home and persisted contact through real Django');

    await page.goto('/admin/noticias');
    await page.waitForURL('**/admin/login');
    await page.locator('#admin-email').fill(process.env.INTEGRATION_EMAIL);
    await page.locator('#admin-password').fill(process.env.INTEGRATION_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/auth/login/') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Ingresar al panel' }).click(),
    ]);
    assert.equal(loginResponse.status(), 200);
    const session = await loginResponse.json();
    await page.waitForURL('**/admin');
    const headers = { Authorization: `Bearer ${session.access}` };
    assert.equal((await api.get('/api/v1/auth/me/', { headers })).status(), 200);
    assert.equal(
      (await api.post('/api/v1/auth/refresh/', { data: { refresh: session.refresh } })).status(),
      200,
    );
    await page.getByRole('link', { name: 'Gestionar noticias', exact: true }).click();
    await page.getByRole('button', { name: 'Añadir noticia' }).click();
    await page.locator('#news-title').fill('Noticia creada desde React');
    await page.locator('#news-date').fill('2026-10-20');
    await page.locator('#news-description').fill('Contenido persistido mediante el editor real.');
    await page.locator('#news-image-file').setInputFiles(process.env.INTEGRATION_IMAGE);
    const [createdResponse, uploadedResponse] = await Promise.all([
      page.waitForResponse(
        (r) => /\/news\/$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
      ),
      page.waitForResponse(
        (r) => r.url().includes('/admin/media/') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click(),
    ]);
    assert.equal(createdResponse.status(), 201);
    assert.equal(uploadedResponse.status(), 201);
    const created = await createdResponse.json();
    const image = await uploadedResponse.json();
    assert.equal((await api.get(image.url)).status(), 200);
    assert.equal((await api.get(`/api/v1/news/${created.id}/`)).status(), 200);
    await page.getByText('Noticia creada en Django.', { exact: true }).waitFor();
    const card = page.getByRole('row').filter({ hasText: 'Noticia creada desde React' });
    await card.getByRole('button', { name: /Editar/ }).click();
    await page.locator('#news-title').fill('Noticia actualizada desde React');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByText('Noticia actualizada en Django.', { exact: true }).waitFor();
    assert.equal(
      (await (await api.get(`/api/v1/news/${created.id}/`)).json()).title,
      'Noticia actualizada desde React',
    );
    console.log('PASS JWT login/me/refresh and news create/upload/edit with persisted data');

    await page.getByRole('link', { name: 'Mensajes', exact: true }).click();
    await page.getByText('Visitante integrado', { exact: true }).waitFor();
    const inquiry = page.locator('article').filter({ hasText: 'Visitante integrado' });
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/inquiries/${receipt.id}/`) && r.request().method() === 'PATCH',
      ),
      inquiry.getByRole('button', { name: /Atendido|atendido/ }).click(),
    ]);
    assert.equal(
      (await (await api.get(`/api/v1/inquiries/${receipt.id}/`, { headers })).json()).status,
      'atendido',
    );
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/inquiries/${receipt.id}/`) && r.request().method() === 'PATCH',
      ),
      inquiry.getByRole('button', { name: /Archivar/ }).click(),
    ]);
    assert.equal(
      (await (await api.get(`/api/v1/inquiries/${receipt.id}/`, { headers })).json()).status,
      'archivado',
    );
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/logout/')),
      page.getByRole('button', { name: 'Salir del panel' }).click(),
    ]);
    await page.waitForURL('**/admin/login');
    // Revocation completed before checking the former access token.
    assert.equal((await api.get('/api/v1/auth/me/', { headers })).status(), 401);
    console.log('PASS persisted inbox transitions and revoked session');

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of [
        '/noticias',
        `/noticias/${created.id}/`,
        '/contacto',
        '/proyectos',
        `/proyectos/${process.env.INTEGRATION_PROJECT}`,
        '/bienes-raices',
        `/bienes-raices/${process.env.INTEGRATION_PROPERTY}`,
      ]) {
        await page.goto(path);
        await page.locator('main h1').first().waitFor();
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          path,
        );
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin/login');
    await page.locator('#admin-email').fill('architect@example.test');
    await page.locator('#admin-password').fill(process.env.INTEGRATION_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await page.waitForURL('**/admin');
    assert.equal(await page.getByRole('link', { name: 'Noticias', exact: true }).count(), 0);
    await page.evaluate(() => {
      history.pushState({}, '', '/admin/noticias');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await page
      .getByRole('alert')
      .filter({ hasText: 'Esta sección no está disponible para tu rol' })
      .waitFor();
    await page.getByRole('button', { name: 'Salir del panel' }).click();
    await page.waitForURL('**/admin/login');
    await page.locator('#admin-email').fill(process.env.INTEGRATION_EMAIL);
    await page.locator('#admin-password').fill(process.env.INTEGRATION_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await page.waitForURL('**/admin');
    await page.getByRole('link', { name: 'Gestionar noticias', exact: true }).click();
    await page
      .getByRole('row')
      .filter({ hasText: 'Noticia actualizada desde React' })
      .getByRole('button', { name: /Eliminar/ })
      .click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, eliminar' }).click();
    await page.getByText('Noticia eliminada en Django.', { exact: true }).waitFor();
    assert.equal((await api.get(`/api/v1/news/${created.id}/`)).status(), 404);
    // Deleting a news item must not invoke the unsafe media deletion operation.
    assert.equal((await api.get(image.url)).status(), 200);
    console.log('PASS role denial and news deletion without removing uploaded media');
    assert.deepEqual(errors, []);
    console.log(
      'PASS public routes, media and responsive layout against real Django (catalog read smoke only)',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
