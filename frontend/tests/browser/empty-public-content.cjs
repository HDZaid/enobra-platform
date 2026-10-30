// Respuestas API incompletas simuladas: no cambia datos del servidor.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { reference: company } = await import('../../src/components/layout/data/reference.js');
  const { reference: institution } = await import('../../src/features/about/data/reference.js');
  const { reference: services } = await import('../../src/features/services/data/reference.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage(); const errors = []; let partial = false;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      let data;
      if (path.endsWith('/company/')) data = { ...company, person: '', address: partial ? 'Dirección válida de API' : ' ', phones: [' '], whatsapp: '', email: '' };
      else if (path.endsWith('/institution/')) data = { ...institution, presentation: partial ? ['Historia válida de API.'] : [], mission: '', vision: ' ', principles: [] };
      else if (path.endsWith('/services/')) data = [{ ...services[0], title: ' ' }];
      else return route.fulfill({ status: 501, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of [false, true]) {
        partial = mode;
        for (const path of ['/contacto', '/nosotros', '/servicios', '/']) {
          await page.goto(`${process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'}${path}`);
          await page.waitForLoadState('networkidle');
          const address = partial ? 'Dirección válida de API' : company.address;
          await page.getByRole('contentinfo').getByText(address, { exact: true }).waitFor();
          assert.equal(await page.getByRole('contentinfo').locator('a[href^="tel:"]').count(), company.phones.length);
          assert.equal(await page.getByText('Correo institucional: pendiente de confirmar.', { exact: true }).count(), 0);
          assert.equal(await page.locator('.leo-content-status').count(), 0);
          if (path === '/contacto') {
            const contact = page.locator('section[aria-labelledby="contact-heading"]');
            await contact.getByText(address, { exact: true }).waitFor();
            await contact.getByText(company.person, { exact: true }).waitFor();
            assert.equal(await contact.locator('a[href^="tel:"]').count(), company.phones.length);
            assert.equal(await contact.locator('a[href^="https://wa.me/"]').count(), 1);
          }
          if (path === '/nosotros') {
            assert.ok((await page.locator('#presentation').innerText()).includes(partial ? 'Historia válida de API.' : institution.presentation[0]));
            assert.equal((await page.locator('#mission').innerText()).trim(), institution.mission);
            assert.ok((await page.locator('#vision').innerText()).trim());
            assert.equal(await page.locator('#principles > article').count(), institution.principles.length);
          }
          if (path === '/servicios') assert.equal(await page.locator('#service-list > article').count(), services.length);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Contacto, pie, Nosotros y Servicios con respuestas vacías/parciales; campos válidos conservados, sin avisos técnicos, escritorio y móvil.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
