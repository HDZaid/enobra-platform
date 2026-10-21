import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { mapProject, projectsService } from '../src/features/projects/services/projectsService.js';
import {
  mediaUrl,
  mapPage,
  parseYoutube,
} from '../src/features/projects/services/catalogMapper.js';
import {
  mapProperty,
  formatPrice,
  propertiesService,
} from '../src/features/properties/services/propertiesService.js';
import {
  propertyQuery,
  readFilters,
  validateFilters,
} from '../src/features/properties/services/propertyFilters.js';
import {
  requestVisit,
  todayLocal,
  validateVisit,
} from '../src/features/properties/services/visitService.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const project = {
  id: 'casa-patio',
  title: 'Casa patio',
  category: 'Vivienda',
  country: 'Guatemala',
  year: 2026,
  description: 'Descripción',
  images: ['/media/casa.jpg'],
  renders: ['https://cdn.example.com/render.webp'],
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  published: true,
  demo: true,
};
const property = {
  ...project,
  id: 1,
  operation: 'Venta',
  type: 'Casa',
  zone: 'Zona 9',
  location: 'Quetzaltenango',
  price: 950000,
  rooms: 3,
  baths: 2,
  parking: 2,
  area: 190,
  date: '2026-10-12',
  commercial: 'Condiciones',
};
const page = (results) => ({ count: results.length, page: 1, page_size: 12, results });

test('mapea proyectos y propiedades sin perder demos, galerías, precios o ceros', () => {
  assert.deepEqual(mapProject(project), project);
  assert.deepEqual(mapProperty(property), property);
  assert.equal(mapProperty({ ...property, price: 0, rooms: 0 }).price, 0);
  assert.equal(mapPage(page([]), mapProject).results.length, 0);
  assert.equal(mapPage(page([{ ...project, published: false }]), mapProject).results.length, 0);
  assert.match(formatPrice({ ...property, operation: 'Alquiler' }), /Q .*950.*000 \/ mes/);
});

test('URLs de API conservan media y Storage, bloquean esquemas ajenos e imágenes del mockup', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    '//host/image.jpg',
    'assets/casa.jpg',
    null,
  ])
    assert.equal(mediaUrl(url), '');
  assert.equal(mediaUrl('/media/obras/foto.jpg'), '/media/obras/foto.jpg');
  assert.equal(
    mediaUrl('https://cdn.example.com/foto.jpg?signature=abc'),
    'https://cdn.example.com/foto.jpg?signature=abc',
  );
  assert.equal(
    mapProject({
      ...project,
      images: ['javascript:x'],
      renders: null,
      video: 'https://example.com/page.html',
    }).video,
    '',
  );
  assert.deepEqual(mapProject({ ...project, images: ['javascript:x'] }).images, ['']);
});

const VIDEO_ID = 'dQw4w9WgXcQ';
const EMBED = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`;
const WATCH = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

test('video acepta solo los formatos HTTPS de YouTube del contrato y los conserva sin cambios', () => {
  const valid = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?v=${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}&t=30s`,
    `https://www.youtube.com/watch?list=PLabc&v=${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://youtube.com/embed/${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?t=5`,
    `https://youtu.be/${VIDEO_ID}#t=5`,
    `https://www.youtube.com:443/watch?v=${VIDEO_ID}`,
    `HTTPS://WWW.YOUTUBE.COM/watch?v=${VIDEO_ID}`,
  ];
  for (const video of valid) {
    assert.deepEqual(parseYoutube(video), { id: VIDEO_ID, watchUrl: WATCH, embedUrl: EMBED }, video);
    assert.equal(mapProject({ ...project, video }).video, video, video);
    assert.equal(mapProperty({ ...property, video }).video, video, video);
  }
  assert.equal(parseYoutube('https://youtu.be/a-b_cD3fG9h').id, 'a-b_cD3fG9h');
});

test('video descarta MP4/WebM, hosts inválidos, IDs inválidos y enlaces manipulados', () => {
  const invalid = [
    // El contrato no admite archivos de video: MP4/WebM y /media no se reproducen.
    '/media/video.mp4',
    'https://cdn.example.com/video.mp4',
    'https://cdn.example.com/video.webm?token=abc',
    'https://example.com/page.html',
    // Esquemas inseguros o relativos.
    `http://youtu.be/${VIDEO_ID}`,
    `http://www.youtube.com/watch?v=${VIDEO_ID}`,
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    `//youtu.be/${VIDEO_ID}`,
    `youtu.be/${VIDEO_ID}`,
    // Hosts que no son los del contrato.
    `https://youtube.com.evil.com/watch?v=${VIDEO_ID}`,
    `https://evil.com/youtube.com/watch?v=${VIDEO_ID}`,
    `https://evilyoutube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be.evil.com/${VIDEO_ID}`,
    `https://music.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtu.be/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    'https://vimeo.com/123456789',
    // Credenciales, puertos y ofuscación del host.
    `https://www.youtube.com@evil.com/watch?v=${VIDEO_ID}`,
    `https://user:pass@www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com:8443/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com\\@evil.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be\\evil.com/${VIDEO_ID}`,
    `https://%79outu.be/${VIDEO_ID}`,
    // Rutas e IDs que no cumplen el contrato.
    'https://www.youtube.com/watch?v=',
    'https://www.youtube.com/watch?list=PLabc',
    'https://www.youtube.com/watch?v=dQw4w9WgXc',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXc!',
    `https://www.youtube.com/watch/${VIDEO_ID}`,
    'https://www.youtube.com/playlist?list=PLabc',
    'https://www.youtube.com/embed/',
    `https://www.youtube.com/embed/${VIDEO_ID}/`,
    `https://www.youtube.com/v/${VIDEO_ID}`,
    'https://youtu.be/',
    'https://youtu.be',
    'https://youtu.be/not-valid',
    `https://youtu.be/${VIDEO_ID}/extra`,
    // Inyección de marcado, espacios, saltos de línea y longitud excesiva.
    `https://youtu.be/${VIDEO_ID}"><script>alert(1)</script>`,
    `https://youtu.be/${VIDEO_ID}" onload="alert(1)`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}%22onload%3D1`,
    `https://youtu.be/${VIDEO_ID}\n`,
    `https://youtu.be/${VIDEO_ID}\u0000`,
    ` https://youtu.be/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID} `,
    `https://youtu.be/${VIDEO_ID}?${'a'.repeat(500)}`,
  ];
  for (const video of invalid) {
    assert.equal(parseYoutube(video), null, JSON.stringify(video));
    assert.equal(mapProject({ ...project, video }).video, '', JSON.stringify(video));
    assert.equal(mapProperty({ ...property, video }).video, '', JSON.stringify(video));
  }
});

test('video vacío, ausente o de otro tipo no genera reproductor y conserva el resto del registro', () => {
  for (const video of ['', undefined, null, 42, {}, [], true]) {
    assert.equal(parseYoutube(video), null);
    const mapped = mapProject({ ...project, video });
    assert.equal(mapped.video, '');
    assert.deepEqual(mapped.images, project.images);
    assert.deepEqual(mapped.renders, project.renders);
    assert.equal(mapProperty({ ...property, video }).video, '');
  }
  const withoutVideo = { ...project };
  delete withoutVideo.video;
  assert.equal(mapProject(withoutVideo).video, '');
});

test('embed y enlace de respaldo se construyen solo con el ID, sin reutilizar el enlace recibido', () => {
  const hostile = `https://youtu.be/${VIDEO_ID}?autoplay=1&x=%3Cscript%3Ealert(1)%3C/script%3E#"onload=alert(1)`;
  assert.deepEqual(parseYoutube(hostile), { id: VIDEO_ID, watchUrl: WATCH, embedUrl: EMBED });
  // Igual que Django, gana el primer parámetro v no vacío.
  for (const video of [
    `https://www.youtube.com/watch?v=${VIDEO_ID}&v=AAAAAAAAAAA`,
    `https://www.youtube.com/watch?v=&v=${VIDEO_ID}&v=AAAAAAAAAAA`,
  ])
    assert.equal(parseYoutube(video).embedUrl, EMBED);
});

test('rechaza respuestas malformadas en vez de presentarlas como catálogos vacíos', () => {
  for (const value of [
    null,
    {},
    '<html>',
    { ...page([]), count: '0' },
    { ...page([]), page_size: 0 },
  ])
    assert.throws(() => mapPage(value, mapProject), /contrato/);
  assert.throws(() => mapProject({ ...project, year: '2026' }), /contrato/);
  assert.throws(() => mapProperty({ ...property, price: null }), /contrato/);
});

test('consultas usan parámetros Django, no los nombres antiguos del mockup, y propagan cancelación', async () => {
  const signal = new AbortController().signal;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([url, options]);
    return json(page(url.includes('projects') ? [project] : [property]));
  };
  await projectsService.list({ year: 2026, page: 2, ignored: 'x' }, { signal });
  await propertiesService.list(
    {
      operation: 'Alquiler',
      q: 'Zona 9',
      min_price: 0,
      sort: 'price_asc',
      ids: '1,4',
      page: 2,
      favorites: true,
    },
    { signal },
  );
  assert.equal(calls[0][0], '/api/v1/projects/?year=2026&page=2');
  const query = new URL(calls[1][0], 'http://localhost').searchParams;
  assert.equal(query.get('min_price'), '0');
  assert.equal(query.get('sort'), 'price_asc');
  assert.equal(query.get('ids'), '1,4');
  assert.equal(query.has('favorites'), false);
  assert.ok(
    calls.every(([, options]) => options.signal === signal && !options.headers.Authorization),
  );
});

test('detalles usan el id slug de Django y no exponen registros no publicados', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/v1/projects/casa-patio/');
    return json(project);
  };
  assert.equal((await projectsService.get('casa-patio')).title, 'Casa patio');
  globalThis.fetch = async () => json({ ...property, published: false });
  await assert.rejects(propertiesService.get('1'), (error) => error.status === 404);
  globalThis.fetch = () => {
    throw new Error('No debe consultar');
  };
  await assert.rejects(propertiesService.get('NaN'), (error) => error.status === 404);
  await assert.rejects(projectsService.get('../private'), (error) => error.status === 404);
});

test('facetas y años se validan y los años se ordenan sin duplicados', async () => {
  globalThis.fetch = async () => json({ years: [2024, 2026, 2024] });
  assert.deepEqual(await projectsService.years(), [2026, 2024]);
  globalThis.fetch = async () =>
    json({
      zones: ['Zona 9'],
      types: ['Casa'],
      operations: ['Venta'],
      min_price: 0,
      max_price: 100,
    });
  assert.deepEqual((await propertiesService.facets()).zones, ['Zona 9']);
  globalThis.fetch = async () => json({});
  await assert.rejects(propertiesService.facets(), /Filtros/);
});

test('filtros restauran URL, manejan favoritos y detectan rangos imposibles', () => {
  const values = readFilters(
    new URLSearchParams(
      'operation=Venta&type=Casa&sort=price_desc&min_price=0&max_price=100&favorites=true&page=2',
    ),
  );
  assert.equal(values.page, 2);
  assert.equal(values.favorites, true);
  assert.deepEqual(validateFilters(values), {});
  assert.equal(propertyQuery(values, [1, 5]).ids, '1,5');
  assert.equal(propertyQuery({ ...values, favorites: false }, [1]).ids, undefined);
  assert.ok(validateFilters({ ...values, min_price: '200' }).max_price);
  for (const invalid of ['-1', '1.5', 'NaN', 'Infinity', '1e3'])
    assert.ok(validateFilters({ ...values, min_price: invalid }).min_price);
  assert.equal(
    readFilters(new URLSearchParams('operation=invalid&type=invalid&sort=asc&page=-3')).sort,
    'recent',
  );
});

test('visitas validan nombre, teléfono de 8 dígitos y fechas reales presentes o futuras', () => {
  const valid = { name: ' Geo ', phone: '1234-5678', preferred_date: '2026-10-12' };
  assert.deepEqual(validateVisit(valid, '2026-10-12'), {});
  assert.ok(validateVisit({ ...valid, name: ' ' }, '2026-10-12').name);
  assert.ok(validateVisit({ ...valid, name: 'x'.repeat(121) }, '2026-10-12').name);
  assert.ok(validateVisit({ ...valid, phone: '+50212345678' }, '2026-10-12').phone);
  for (const date of ['2026-10-11', '2027-02-30', '', 'invalid'])
    assert.ok(validateVisit({ ...valid, preferred_date: date }, '2026-10-12').preferred_date);
  assert.equal(todayLocal(new Date(2026, 0, 2, 23)), '2026-01-02');
});

test('solicitar visita envía solo el contrato público y exige un acuse válido', async () => {
  const values = {
    name: ' Geo ',
    phone: '1234-5678',
    preferred_date: todayLocal(),
    extra: 'omitido',
  };
  const receipt = { id: 'visit-1', status: 'nuevo', created_at: '2026-10-12T12:00:00Z' };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/inquiries/visits/');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      property_id: 1,
      name: 'Geo',
      phone: '12345678',
      preferred_date: values.preferred_date,
    });
    return json(receipt, 201);
  };
  assert.deepEqual(await requestVisit(1, values), receipt);
  globalThis.fetch = async () => json({});
  await assert.rejects(requestVisit(1, values), /confirmación válida/);
});

test('errores 404, 501 y errores de campo se propagan sin éxitos ni contenido de demostración', async () => {
  for (const status of [404, 501, 400]) {
    globalThis.fetch = async () =>
      json(
        { error: { code: 'test', message: 'Error', details: { phone: ['Teléfono inválido'] } } },
        status,
      );
    for (const call of [
      () => projectsService.list(),
      () => propertiesService.get(1),
      () => requestVisit(1, { name: 'Geo', phone: '12345678', preferred_date: todayLocal() }),
    ]) {
      await assert.rejects(
        call(),
        (error) => error.status === status && error.details.phone[0] === 'Teléfono inválido',
      );
    }
  }
});
