// API ficticia y reloj acelerado; no usar cuentas ni datos reales.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5187';
const output = process.env.SESSION_QA_OUTPUT || 'output/playwright/session';
const user = { id: 1, name: 'Cuenta de prueba', email: 'test@example.test', role: 'Ingeniero', permissions: ['admin.all'] };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' });
  try {
    async function setup() {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors = []; const calls = []; let logins = 0; let renewals = 0; let revocations = 0; let deny = false;
      page.on('pageerror', (error) => errors.push(error.message));
      await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
      await page.route('**/api/v1/**', (route) => {
        const endpoint = new URL(route.request().url()).pathname.replace('/api/v1/', '');
        calls.push({ endpoint, authorization: route.request().headers().authorization });
        let status = 200; let body = { count: 0, page: 1, page_size: 12, results: [] };
        if (endpoint === 'auth/login/') body = { access: `login-${++logins}`, refresh: `refresh-${logins}`, expires_in: 900, user };
        if (endpoint === 'auth/refresh/') body = { access: `renewed-${++renewals}`, expires_in: 900 };
        if (endpoint === 'auth/logout/') { revocations++; status = 204; body = null; }
        if (endpoint === 'news/' && deny) { status = 401; body = { error: { message: 'Sesión revocada' } }; }
        return route.fulfill({ status, contentType: 'application/json', body: status === 204 ? undefined : JSON.stringify(body) });
      });
      await page.goto(`${base}/admin/login`);
      await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email);
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture');
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      await page.getByRole('navigation', { name: 'Secciones del panel' }).waitFor();
      assert.equal(await page.getByText(/La sesión dura 15 minutos/).count(), 0);
      return { page, errors, calls, get renewals() { return renewals; }, get revocations() { return revocations; }, deny() { deny = true; } };
    }
    const idle = await setup();
    await idle.page.clock.fastForward(840000);
    await idle.page.getByRole('complementary', { name: 'Aviso de vencimiento de sesión' }).waitFor();
    assert.equal(await idle.page.getByRole('timer').innerText(), '1:00');
    assert.equal(idle.renewals, 0);
    await idle.page.screenshot({ path: path.join(output, 'session-countdown.png') });
    await idle.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await idle.page.getByRole('button', { name: 'Seguir trabajando' }).isVisible());
    assert.equal(await idle.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await idle.page.screenshot({ path: path.join(output, 'session-countdown-mobile.png') });
    await idle.page.setViewportSize({ width: 1280, height: 900 });
    const revoked = idle.page.waitForResponse((response) => response.url().includes('auth/logout/'));
    await idle.page.clock.fastForward(61000);
    await idle.page.getByRole('dialog', { name: 'Tu sesión terminó' }).waitFor();
    assert.equal(idle.renewals, 0);
    await revoked;
    assert.equal(idle.revocations, 1);
    await idle.page.screenshot({ path: path.join(output, 'session-expired.png'), fullPage: true });
    assert.deepEqual(idle.errors, []); await idle.page.close();

    const draft = await setup();
    await draft.page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Proyectos', exact: true }).click();
    await draft.page.getByRole('link', { name: 'Nuevo proyecto', exact: true }).click();
    await draft.page.getByLabel('Título *', { exact: true }).fill('Borrador conservado');
    const url = draft.page.url();
    await draft.page.clock.fastForward(901000);
    const dialog = draft.page.getByRole('dialog', { name: 'Tu sesión terminó' });
    await dialog.waitFor();
    await dialog.getByLabel('Contraseña', { exact: true }).fill('fixture');
    await dialog.getByRole('button', { name: 'Volver a entrar', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(draft.page.url(), url);
    assert.equal(await draft.page.getByLabel('Título *', { exact: true }).inputValue(), 'Borrador conservado');
    assert.deepEqual(draft.errors, []); await draft.page.close();

    const active = await setup();
    await active.page.clock.fastForward(800000);
    await active.page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Resumen', exact: true }).click();
    const refreshed = active.page.waitForResponse((response) => response.url().includes('auth/refresh/'));
    await active.page.clock.fastForward(41000); await refreshed;
    await active.page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Noticias', exact: true }).click();
    await active.page.getByRole('heading', { name: 'Noticias y eventos', exact: true }).waitFor();
    assert.equal(active.renewals, 1);
    assert.ok(active.calls.some((call) => call.endpoint === 'news/' && call.authorization === 'Bearer renewed-1'));
    assert.equal(await active.page.getByRole('dialog', { name: 'Tu sesión terminó' }).count(), 0);
    active.deny();
    await active.page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name: 'Resumen', exact: true }).click();
    await active.page.getByRole('dialog', { name: 'Tu sesión terminó' }).waitFor();
    assert.deepEqual(active.errors, []); await active.page.close();
    console.log('PASS: contador, expiración sin actividad, revocación, reingreso con borrador, renovación activa y token nuevo en peticiones.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
