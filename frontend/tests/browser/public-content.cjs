// API/iframe interceptados: revisión de presentación pública, sin escrituras reales.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let offline = false;
    await page.route('**/api/v1/**', (route) => offline ? route.abort('failed') : route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ error: { code: 'not_implemented', message: 'Prueba' } }) }));
    await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
    const forbidden = /No se pudo actualizar la información|Mostramos el contenido de referencia|Información en línea aún no disponible|Actualizando información/;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const failNetwork of [false, true]) {
        offline = failNetwork;
        for (const path of ['/', '/nosotros', '/servicios', '/contacto', '/noticias', '/proyectos', '/bienes-raices']) {
          await page.goto(`${process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'}${path}`);
          await page.locator('h1').first().waitFor();
          if (path === '/') assert.ok(await page.locator('#home-news > *').count() > 0);
          if (path === '/nosotros') assert.ok(await page.locator('#presentation').innerText());
          if (path === '/servicios') assert.equal(await page.locator('#service-list > article').count(), 4);
          assert.equal(await page.locator('.leo-content-status').count(), 0);
          assert.equal(forbidden.test(await page.locator('body').innerText()), false);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width} ${path}`);
          await page.getByRole('button', { name: 'Abrir buscador', exact: true }).click();
          await page.getByRole('dialog').waitFor();
          assert.equal(forbidden.test(await page.getByRole('dialog').innerText()), false);
          await page.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: siete rutas públicas y buscador a 1440/390 px, API 501 y sin red, contenido conservado sin avisos técnicos.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
