import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogLinkPreview } from '../src/services/catalogLinkPreview.js';
import { catalogWhatsAppLink, whatsappLink } from '../src/services/whatsapp.js';

const origin = 'https://enobra.com.gt';
const title = 'Casa "Álamo" & Jardín';
const cover = 'https://images.example.com/alamo.jpg';
const item = { id: 17, published: true, title, description: 'Sala < jardín', images: [cover] };

test('WhatsApp incluye el enlace solo al consultar un elemento del catálogo', () => {
  const phone = '+502 5726 5711';
  const general = new URL(whatsappLink(phone));
  assert.equal(general.pathname, '/50257265711');
  assert.equal(general.searchParams.get('text'), 'Hola, quisiera información sobre los servicios de EnObra.');

  const property = new URL(catalogWhatsAppLink(phone, 'properties', item, origin));
  const message = property.searchParams.get('text');
  assert.ok(message.includes(title));
  assert.ok(message.endsWith(origin + '/bienes-raices/17'));

  const project = new URL(catalogWhatsAppLink(phone, 'projects', { ...item, id: 'casa-alamo' }, origin));
  assert.ok(project.searchParams.get('text').endsWith(origin + '/proyectos/casa-alamo'));
  assert.equal(whatsappLink('123'), undefined);
});

function context(record) {
  return {
    request: new Request(origin + '/bienes-raices/17?source=chat'),
    params: { id: '17' },
    env: {
      ASSETS: {
        fetch: async () => Response.json({
          status: 'ok',
          properties: { count: 1, pageSize: 12, items: [record] },
          media: { [cover]: '/data/media/cover.jpg' },
        }),
      },
    },
    next: async () => new Response('<html><head></head><body><div id="root"></div></body></html>', {
      headers: { 'Content-Type': 'text/html', ETag: '"original"' },
    }),
  };
}

test('la vista previa usa una portada pública y escapa los datos en el HTML', async () => {
  const result = await catalogLinkPreview(context(item), 'properties');
  const html = await result.text();
  assert.match(html, /content="Casa &quot;Álamo&quot; &amp; Jardín"/);
  assert.match(html, /content="Sala &lt; jardín"/);
  assert.ok(html.includes(`content="${origin}/data/media/cover.jpg"`));
  assert.ok(html.includes(`content="${origin}/bienes-raices/17"`));
  assert.match(html, /id="root"/);
  assert.equal(result.headers.get('ETag'), null);

  const hidden = await catalogLinkPreview(context({ ...item, published: false }), 'properties');
  assert.doesNotMatch(await hidden.text(), /og:image/);
});
