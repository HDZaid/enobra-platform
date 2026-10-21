// Ejecutar únicamente contra un entorno de integración desechable: crea cuentas reales en esa base.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const baseURL = process.env.INTEGRATION_BASE_URL;
  const password = process.env.INTEGRATION_PASSWORD;
  assert(baseURL && password && process.env.INTEGRATION_EMAIL, 'Se requiere el entorno de integración aislado.');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
  try {
    const page = await browser.newPage({ baseURL });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin/login');
    await page.locator('#admin-email').fill(process.env.INTEGRATION_EMAIL);
    await page.locator('#admin-password').fill(password);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await page.waitForURL('**/admin');
    await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
    await page.getByRole('cell', { name: new RegExp(process.env.INTEGRATION_EMAIL.replace('.', '\\.')) }).waitFor();
    async function openForm(email, active = true) {
      await page.getByRole('button', { name: 'Añadir usuario' }).click();
      await page.locator('#user-name').fill('Colaborador de integración');
      await page.locator('#user-email').fill(email);
      await page.locator('#user-password').fill(password);
      await page.locator('#user-confirmation').fill(password);
      await page.locator('#user-role_id').selectOption({ label: 'Empleado' });
      if (!active) await page.getByRole('checkbox', { name: 'Cuenta activa' }).uncheck();
    }
    const email = process.env.INTEGRATION_USER_EMAIL || 'nuevo-integrado@example.test';
    const inactiveEmail = process.env.INTEGRATION_INACTIVE_EMAIL || 'inactivo-integrado@example.test';
    await openForm(email);
    const [response] = await Promise.all([
      page.waitForResponse((reply) => reply.url().endsWith('/admin/users/') && reply.request().method() === 'POST'),
      page.getByRole('button', { name: 'Crear usuario', exact: true }).click(),
    ]);
    assert.equal(response.status(), 201);
    const created = await response.json();
    assert.equal(created.email, email);
    assert.equal(created.roles[0].name, 'Empleado');
    assert(!JSON.stringify(created).includes(password));
    assert.equal(created.password_hash, undefined);
    await page.getByRole('cell', { name: new RegExp(email) }).waitFor();
    await openForm(email);
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await page.getByText('Ya existe un usuario con este correo.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await openForm(inactiveEmail, false);
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await page.getByText('Usuario creado: Colaborador de integración. La cuenta está inactiva.', { exact: true }).waitFor();
    const inactiveLogin = await page.request.post('/api/v1/auth/login/', { data: { email: inactiveEmail, password } });
    assert.equal(inactiveLogin.status(), 401);
    await page.getByRole('button', { name: 'Salir del panel' }).click();
    await page.locator('#admin-email').fill(email);
    await page.locator('#admin-password').fill(password);
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    await page.waitForURL('**/admin');
    assert.equal(await page.getByRole('link', { name: 'Usuarios', exact: true }).count(), 0);
    await page.evaluate(() => { history.pushState({}, '', '/admin/usuarios'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS React -> Django -> base configurada: creación activa/inactiva, duplicados, rol efectivo, nuevo login y acceso restringido');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
