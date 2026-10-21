// Pruebas de interfaz con fixtures interceptados; no escriben cuentas en Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const base = process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const roles = [
      { id: 1, name: 'Ingeniero', description: 'Administrador principal de EnObra.', active: true, permissions: ['admin.all'] },
      { id: 2, name: 'Arquitecta', description: 'Publicaciones de bienes raíces.', active: true, permissions: ['properties.publish'] },
      { id: 3, name: 'Empleado', description: 'Puede preparar borradores propios de bienes raíces.', active: true, permissions: ['properties.create'] },
    ];
    const accounts = [
      { id: '1', name: 'Administrador de prueba', email: 'admin@example.test', active: true, roles: [roles[0]], created_at: '2026-10-21T12:00:00Z' },
      { id: '2', name: 'Colaborador de prueba', email: 'colaborador@example.test', active: false, roles: [roles[2]], created_at: '2026-10-20T12:00:00Z' },
    ];
    let mode = 'ready';
    let userRole = 'Ingeniero';
    let posts = 0;
    let duplicate = true;
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const endpoint = url.pathname.replace('/api/v1/', '');
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (endpoint === 'auth/login/') return reply({ access: 'fixture-access', refresh: 'fixture-refresh',
        user: { id: '1', name: 'Cuenta de prueba', email: 'owner@example.test', role: userRole, roles: [userRole],
          permissions: userRole === 'Ingeniero' ? ['admin.all'] : ['properties.create'] } });
      if (endpoint === 'auth/logout/') return route.fulfill({ status: 204 });
      if (endpoint === 'admin/users/roles/') return mode === 'roles-error' ? reply({ error: { message: 'Roles no disponibles' } }, 503) : reply(roles);
      if (endpoint === 'admin/users/' && request.method() === 'POST') {
        assert.equal(request.headers().authorization, 'Bearer fixture-access');
        const data = request.postDataJSON();
        assert.equal(data.confirmation, undefined);
        posts += 1;
        if (duplicate) return reply({ error: { message: 'Los datos enviados no son válidos.', details: { email: ['Ya existe un usuario con este correo.'] } } }, 400);
        await new Promise((resolve) => setTimeout(resolve, 150));
        const created = { id: '3', name: data.name, email: data.email, active: data.active,
          roles: [roles.find((role) => role.id === data.role_id)], created_at: new Date().toISOString() };
        accounts.unshift(created);
        return reply(created, 201);
      }
      if (endpoint === 'admin/users/') {
        if (mode === 'list-error') return reply({ error: { message: 'Sesión vencida' } }, 401);
        const q = url.searchParams.get('q') || '';
        const results = accounts.filter((item) => `${item.name} ${item.email}`.includes(q));
        return reply({ count: results.length, results, page: 1, page_size: 12 });
      }
      return reply({ count: 0, results: [] });
    });
    async function login() {
      await page.goto(base + '/admin/login');
      await page.locator('#admin-email').fill('owner@example.test');
      await page.locator('#admin-password').fill('Fixture!2026@Obra');
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      await page.waitForURL('**/admin');
    }
    await login();
    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await page.getByRole('cell', { name: 'admin@example.test', exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Añadir usuario' }).isEnabled(), true);
    const screenshots = process.env.SCREENSHOT_DIR;
    if (screenshots) {
      await fs.mkdir(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, 'usuarios-desktop.png'), fullPage: true });
    }
    await page.getByRole('button', { name: 'Añadir usuario' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    assert.equal(posts, 0);
    await page.locator('#user-name').fill('Nueva colaboradora');
    await page.locator('#user-email').fill('nueva@example.test');
    await page.locator('#user-password').fill('Clave!Privada2026');
    await page.locator('#user-confirmation').fill('Otra!Privada2026');
    await page.locator('#user-role_id').selectOption('3');
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await page.getByText('Las contraseñas no coinciden.', { exact: true }).waitFor();
    assert.equal(posts, 0);
    await page.locator('#user-confirmation').fill('Clave!Privada2026');
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'usuarios-formulario.png'), fullPage: true });
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await page.getByText('Ya existe un usuario con este correo.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    assert.equal(posts, 1);
    duplicate = false;
    await page.locator('#user-email').fill('otra@example.test');
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await page.getByText(/Usuario creado: Nueva colaboradora/).waitFor();
    await page.getByRole('cell', { name: /otra@example.test/ }).waitFor();
    assert.equal(posts, 2);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('searchbox', { name: 'Buscar por nombre o correo' }).fill('inexistente');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByText('No encontramos usuarios', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
    await page.getByRole('cell', { name: /otra@example.test/ }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'usuarios-movil.png'), fullPage: true });
    await page.getByRole('button', { name: 'Añadir usuario' }).click();
    assert.equal(await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth), true);
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'usuarios-formulario-movil.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    mode = 'roles-error';
    await page.getByRole('button', { name: 'Actualizar usuarios' }).click();
    await page.getByText('Roles no disponibles', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Añadir usuario' }).isDisabled(), true);
    mode = 'ready';
    await page.getByRole('button', { name: 'Reintentar carga de roles' }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((button) => button.textContent.includes('Añadir usuario')).disabled);
    mode = 'list-error';
    await page.getByRole('button', { name: 'Actualizar usuarios' }).click();
    await page.getByText('Tu sesión venció. Vuelve a iniciar sesión para continuar.', { exact: true }).waitFor();
    mode = 'ready';
    await page.getByRole('button', { name: 'Reintentar consulta' }).click();
    await page.getByRole('cell', { name: /otra@example.test/ }).waitFor();
    for (const role of ['Arquitecta', 'Empleado']) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('button', { name: 'Salir del panel' }).click();
      userRole = role;
      await login();
      assert.equal(await page.getByRole('link', { name: 'Usuarios', exact: true }).count(), 0);
      await page.evaluate(() => { history.pushState({}, '', '/admin/usuarios'); dispatchEvent(new PopStateEvent('popstate')); });
      await page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Añadir usuario' }).count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS usuarios: creación, validación, duplicados, estados, búsqueda, móvil y permisos de rutas/barra lateral');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
