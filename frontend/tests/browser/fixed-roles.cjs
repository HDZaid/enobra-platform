// Solo con el runner SQLite temporal: no usar cuentas ni base real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; let authorization;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (request.headers().authorization) authorization = request.headers().authorization; });
    const base = process.env.INTEGRATION_BASE_URL;
    for (const [email, label] of [['integration@example.test', 'Administrador'], ['architect@example.test', 'Arquitecto'], ['employee@example.test', 'Empleado']]) {
      await page.goto(`${base}/admin/login`);
      await page.getByLabel('Correo electrónico').fill(email);
      await page.getByLabel('Contraseña', { exact: true }).fill(process.env.INTEGRATION_PASSWORD);
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
      await nav.waitFor();
      assert.equal(await nav.getByRole('link', { name: 'Roles', exact: true }).count(), 0);
      assert.equal(await nav.getByRole('link', { name: 'Usuarios', exact: true }).count(), label === 'Empleado' ? 0 : 1);
      assert.equal(await nav.getByRole('link', { name: 'Papelera', exact: true }).count(), label === 'Empleado' ? 0 : 1);
      assert.ok((await page.locator('aside').innerText()).includes(label));
      if (label !== 'Empleado') {
        await nav.getByRole('link', { name: 'Usuarios', exact: true }).click();
        await page.getByRole('heading', { name: 'Usuarios del panel' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Añadir usuario', exact: true }).count(), label === 'Administrador' ? 1 : 0);
        if (label === 'Administrador') {
          await page.getByRole('button', { name: 'Añadir usuario', exact: true }).click();
          const select = page.locator('#user-role_id');
          await select.waitFor();
          assert.deepEqual(await select.locator('option').allTextContents(), ['Selecciona un rol', 'Administrador', 'Empleado', 'Arquitecto']);
          await select.selectOption({ label: 'Empleado' });
          assert.match(await page.locator('#user-role-help').innerText(), /Crea, edita y publica/);
          await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        } else {
          const employee = page.getByRole('row').filter({ hasText: 'employee@example.test' });
          await employee.getByRole('button', { name: /Editar usuario/ }).click();
          await page.getByRole('dialog').waitFor();
          assert.equal(await page.locator('#edit-user-role_id').count(), 0);
          await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
        }
      }
      const headers = { Authorization: authorization };
      for (const path of ['admin/roles/', 'admin/roles/1/']) {
        assert.equal((await page.request.post(`${base}/api/v1/${path}`, { headers, data: { name: 'No permitido' } })).status(), 404);
      }
      assert.equal((await page.request.post(`${base}/api/v1/admin/users/`, { headers, data: {} })).status(), label === 'Administrador' ? 400 : 403);
      const upload = await page.request.post(`${base}/api/v1/admin/media/`, { headers, multipart: { file: { name: 'prueba.png', mimeType: 'image/png', buffer: fs.readFileSync(process.env.INTEGRATION_IMAGE) }, kind: 'photo' } });
      assert.equal(upload.status(), 201);
      if (label === 'Empleado') {
        await nav.getByRole('link', { name: 'Proyectos', exact: true }).click();
        const row = page.getByRole('row').filter({ hasText: 'Proyecto de integración' });
        await row.waitFor();
        assert.equal(await row.getByRole('button', { name: 'Enviar a papelera', exact: true }).count(), 0);
        await row.getByRole('link', { name: 'Editar', exact: true }).click();
        await page.getByLabel('Título *', { exact: true }).fill('Proyecto editado por Empleado');
        await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click();
        await page.waitForURL('**/admin/proyectos');
        await page.getByRole('row').filter({ hasText: 'Proyecto editado por Empleado' }).waitFor();
      }
    }
    await page.goto(`${base}/admin/roles/nuevo`);
    assert.equal(await page.getByRole('button', { name: 'Crear rol', exact: true }).count(), 0);
    assert.equal(await page.locator('select').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: tres roles reales, sin menú/rutas de Roles; selector fijo, permisos de Usuarios, subida por todos y edición ajena por Empleado; API de roles bloqueada.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
