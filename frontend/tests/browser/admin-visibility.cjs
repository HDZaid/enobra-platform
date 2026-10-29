// API simulada. Verifica ausencia de controles y redirección sin montar la vista.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const profiles = [
      { role: 'Arquitecta', permissions: ['properties.create', 'properties.edit.any', 'properties.publish', 'properties.trash.any', 'properties.restore', 'media.upload'], links: ['Resumen', 'Bienes raíces', 'Papelera'] },
      { role: 'Empleado', permissions: ['properties.create', 'properties.edit.own', 'properties.trash.own', 'media.upload'], links: ['Resumen', 'Bienes raíces', 'Papelera'] },
      { role: 'Solo lectura', permissions: ['users.read', 'roles.read'], links: ['Resumen', 'Usuarios', 'Roles'] },
      { role: 'Editor sin papelera', permissions: ['properties.edit.any'], links: ['Resumen', 'Bienes raíces'] },
      { role: 'Ingeniero', permissions: ['admin.all'], links: ['Resumen', 'Bienes raíces', 'Proyectos', 'Noticias', 'Papelera', 'Mensajes', 'Usuarios', 'Roles', 'Historial'] },
    ];
    for (const profile of profiles) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const calls = []; const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/v1/**', (route) => {
        const path = new URL(route.request().url()).pathname.replace('/api/v1/', '');
        calls.push(path);
        let data = { count: 0, results: [], page: 1, page_size: 12 };
        if (path === 'auth/login/') data = { access: 'fixture', refresh: 'fixture', user: { id: 1, name: 'Prueba', ...profile } };
        if (path === 'properties/facets/') data = { zones: [], types: [], operations: [] };
        if (path === 'properties/') data = { count: 1, page: 1, page_size: 12, results: [{ id: 1, title: 'Propiedad de prueba', operation: 'Venta', type: 'Casa', zone: 'Zona 1', location: 'Guatemala', date: '2026-10-24', description: 'Prueba', commercial: '', price: 100, rooms: 1, baths: 1, parking: 1, area: 100, images: [], renders: [], video: '', demo: false, published: false }] };
        if (path === 'admin/users/roles/' || path === 'admin/roles/') data = [{ id: 1, name: 'Ingeniero', description: '', active: true, permissions: ['admin.all'] }];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto(`${process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'}/admin/login`);
      await page.getByLabel('Correo electrónico').fill('test@example.test');
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture');
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
      await nav.waitFor();
      assert.deepEqual(await nav.getByRole('link').allTextContents(), [...profile.links, ' Ver el sitio']);
      if (profile.permissions.includes('users.read') || profile.permissions.includes('admin.all')) {
        await nav.getByRole('link', { name: 'Usuarios', exact: true }).click();
        await page.getByRole('heading', { name: 'Usuarios del panel' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Añadir usuario', exact: true }).count(), profile.permissions.includes('admin.all') ? 1 : 0);
      }
      if (profile.role === 'Editor sin papelera') {
        await nav.getByRole('link', { name: 'Bienes raíces', exact: true }).click();
        await page.getByText('Propiedad de prueba', { exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Enviar a la papelera Propiedad de prueba', exact: true }).count(), 0);
        assert.equal(await page.getByRole('link', { name: 'Editar Propiedad de prueba', exact: true }).count(), 1);
      }
      if (!profile.permissions.includes('admin.all')) {
        const denied = profile.permissions.includes('users.read') ? ['/admin/historial', '/admin/roles/nuevo', '/admin/proyectos/nuevo'] : ['/admin/historial', '/admin/usuarios', '/admin/roles/nuevo', '/admin/noticias'];
        for (const path of denied) {
          const before = calls.length;
          await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path);
          await page.waitForURL('**/admin');
          assert.equal(await page.getByText('Esta sección no está disponible para tu rol', { exact: true }).count(), 0);
          assert.equal(calls.slice(before).some((endpoint) => /^(admin\/(audit|users|roles)|news\/)/.test(endpoint) && !profile.links.includes(endpoint.startsWith('news') ? 'Noticias' : endpoint.includes('audit') ? 'Historial' : endpoint.includes('users') ? 'Usuarios' : 'Roles')), false);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: Arquitecta, Empleado, lectura, editor sin papelera e Ingeniero; menús por permiso, Añadir usuario oculto y rutas no autorizadas redirigidas.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
