// API interceptada: no escribe datos en Supabase. Ejecutar contra Vite en desarrollo.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
  try {
    for (const permissions of [['inquiries.read'], ['inquiries.manage'], ['news.edit'], ['news.create'], ['news.publish'], ['news.delete'], ['properties.create'], ['admin.all']]) {
      const page = await browser.newPage();
      const errors = [];
      const calls = [];
      const writes = [];
      let failure = null;
      page.on('pageerror', (error) => errors.push(error.message));
      const news = { id: 'noticia-prueba', title: 'Noticia de prueba', category: 'Anuncios', date: '2026-10-24', description: 'Contenido de prueba', image: '/media/prueba.jpg', published: true, demo: false };
      await page.route('**/api/v1/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const endpoint = url.pathname.replace('/api/v1/', '');
        const reply = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        if (endpoint === 'auth/login/') return reply({ access: 'fixture', refresh: 'fixture-refresh', user: { id: 1, name: 'Cuenta de prueba', role: 'Prueba', permissions } });
        calls.push(endpoint);
        if (request.method() !== 'GET') {
          writes.push(request.postDataJSON());
          if (failure === 'network') return route.abort('failed');
          if (failure) return route.fulfill({ status: failure, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Fallo de prueba', details: { title: ['Título rechazado por Django.'] } } }) });
          return reply(news);
        }
        const results = endpoint.startsWith('news') ? [news] : endpoint.startsWith('inquiries') ? [{ id: '1', kind: 'contacto', name: 'Visitante', status: 'nuevo', message: 'Consulta de prueba' }] : [];
        return reply({ count: 7, results, page: 1, page_size: 12 });
      });
      await page.goto(`${process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'}/admin/login`);
      await page.getByLabel('Correo electrónico').fill('test@example.test');
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture');
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
      await nav.waitFor();
      const full = permissions.includes('admin.all');
      if (permissions[0] === 'properties.create') {
        await page.getByRole('region', { name: 'Indicadores' }).getByText('7', { exact: true }).waitFor();
        assert.deepEqual([...new Set(calls)], ['properties/']);
      } else if (permissions[0].startsWith('inquiries') || full) {
        await nav.getByRole('link', { name: 'Mensajes', exact: true }).click();
        await page.getByText('Visitante', { exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Marcar atendido', exact: true }).count(), full || permissions.includes('inquiries.manage') ? 1 : 0);
        if (!full) { await page.close(); continue; }
      }
      if (permissions[0].startsWith('news') || full) {
        await nav.getByRole('link', { name: 'Noticias', exact: true }).click();
        await page.getByText(news.title, { exact: true }).waitFor();
        for (const [name, permission] of [['Añadir noticia', 'news.create'], ['Editar Noticia de prueba', 'news.edit'], ['Pasar a borrador Noticia de prueba', 'news.publish'], ['Eliminar Noticia de prueba', 'news.delete']]) {
          assert.equal(await page.getByRole('button', { name, exact: true }).count(), full || permissions.includes(permission) ? 1 : 0, `${permissions}: ${name}`);
        }
        if (permissions.includes('news.edit') || permissions.includes('news.create')) {
          const editing = permissions.includes('news.edit');
          await page.getByRole('button', { name: editing ? 'Editar Noticia de prueba' : 'Añadir noticia', exact: true }).click();
          const dialog = page.getByRole('dialog');
          assert.equal(await dialog.getByRole('button', { name: 'Guardar y publicar', exact: true }).count(), 0);
          if (!editing) {
            await dialog.getByLabel('Título *', { exact: true }).fill('Nueva noticia');
            await dialog.getByLabel('Contenido *', { exact: true }).fill('Contenido de prueba');
            await dialog.getByLabel('Referencia de imagen').fill('/media/prueba.jpg');
          }
          const titleBefore = await dialog.getByLabel('Título *', { exact: true }).inputValue();
          for (const status of [400, 401, 403, 501, 503, 'network']) {
            failure = status;
            await dialog.getByRole('button', { name: editing ? 'Guardar cambios' : 'Guardar borrador', exact: true }).click();
            await dialog.getByRole('alert').last().waitFor();
            await dialog.getByRole('button', { name: editing ? 'Guardar cambios' : 'Guardar borrador', exact: true }).waitFor({ state: 'visible' });
            assert.equal(await dialog.isVisible(), true);
            assert.equal(await dialog.getByLabel('Título *', { exact: true }).inputValue(), titleBefore);
            assert.equal(await page.getByText(/Noticia (creada|actualizada) en Django/).count(), 0);
            if (status === 400) await dialog.getByText('Título rechazado por Django.', { exact: true }).waitFor();
          }
          failure = null;
          await dialog.getByRole('button', { name: editing ? 'Guardar cambios' : 'Guardar borrador', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(writes.length, 7);
          assert.equal(writes[0].published, editing ? undefined : false);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: 8 perfiles; permisos, conteos, guardado y formularios conservados ante 400/401/403/501/503/sin red (API simulada).');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
