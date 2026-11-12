// Genera public/data/catalog-snapshot.json y public/data/media/* antes de `vite build`.
// Así el sitio publicado muestra Proyectos y Bienes raíces al instante, aunque el backend de
// Render esté dormido. Nunca rompe el build: si el backend no responde, escribe status "failed"
// y el panel administrativo lo advierte.
//
// Se ejecuta solo en Cloudflare Pages (CF_PAGES=1) o con CATALOG_SNAPSHOT=1, y solo si
// VITE_API_BASE_URL es una URL https absoluta. En local no hace nada.
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogFingerprint,
  SNAPSHOT_ITEM_LIMIT,
  SNAPSHOT_MEDIA_DIR,
  SNAPSHOT_VERSION,
} from '../src/services/catalogSnapshot.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'data');
const mediaDir = join(outDir, 'media');
const WAKE_TIMEOUT = 100_000; // el arranque en frío de Render ronda 30–60 s
const REQUEST_TIMEOUT = 30_000;
const MEDIA_BUDGET = 15 * 1024 * 1024; // total de imágenes copiadas
const MEDIA_MAX_FILE = 4 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const log = (message) => console.log(`[snapshot] ${message}`);

async function get(url, timeout = REQUEST_TIMEOUT) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${response.status} en ${new URL(url).pathname}`);
  return response.json();
}

function page(value) {
  if (!value || !Array.isArray(value.results) || !Number.isInteger(value.count))
    throw new Error('Respuesta de listado inesperada');
  return value;
}

async function catalog(base, kind, extraPath, extraName) {
  const [all, first, extra] = await Promise.all([
    get(`${base}/${kind}/?page_size=100`).then(page),
    get(`${base}/${kind}/`).then(page),
    get(`${base}/${kind}/${extraPath}`),
  ]);
  const published = all.results.filter((item) => item?.published === true);
  return {
    fingerprint: catalogFingerprint(all),
    section: {
      count: all.count,
      pageSize: first.page_size,
      items: published.slice(0, SNAPSHOT_ITEM_LIMIT),
      [extraName]: extra,
    },
  };
}

// Primero la portada de cada publicación; luego el resto de imágenes y renders.
function mediaQueue(sections) {
  const items = sections.flatMap((section) => section.items);
  const ordered = [
    ...items.map((item) => item.images?.[0]),
    ...items.flatMap((item) => [...(item.images || []).slice(1), ...(item.renders || [])]),
  ];
  return [...new Set(ordered.filter((url) => typeof url === 'string' && /^https:\/\//.test(url)))];
}

async function copyMedia(urls) {
  const media = {};
  let used = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
      const type = (response.headers.get('content-type') || '').split(';')[0].trim();
      if (!response.ok || !IMAGE_TYPES[type]) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MEDIA_MAX_FILE) continue;
      if (used + bytes.length > MEDIA_BUDGET) {
        log('se alcanzó el límite de imágenes; el resto se carga desde el backend');
        break;
      }
      const name = createHash('sha256').update(url).digest('hex').slice(0, 24) + IMAGE_TYPES[type];
      await writeFile(join(mediaDir, name), bytes);
      media[url] = SNAPSHOT_MEDIA_DIR + name;
      used += bytes.length;
    } catch (error) {
      log(`imagen omitida (${error.message})`);
    }
  }
  log(`${Object.keys(media).length} imágenes copiadas (${Math.round(used / 1024)} KB)`);
  return media;
}

async function main() {
  const base = (process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const enabled = process.env.CF_PAGES === '1' || process.env.CATALOG_SNAPSHOT === '1';
  if (!enabled) return log('omitido (solo corre en Cloudflare Pages o con CATALOG_SNAPSHOT=1)');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(mediaDir, { recursive: true });
  const snapshot = { version: SNAPSHOT_VERSION, generatedAt: new Date().toISOString() };
  try {
    if (!/^https:\/\//.test(base)) throw new Error('VITE_API_BASE_URL no es una URL https');
    log('despertando el backend…');
    await get(`${base}/health/`, WAKE_TIMEOUT).catch(() => get(`${base}/health/`, WAKE_TIMEOUT));
    const [projects, properties] = await Promise.all([
      catalog(base, 'projects', 'years/', 'years'),
      catalog(base, 'properties', 'facets/', 'facets'),
    ]);
    Object.assign(snapshot, {
      status: 'ok',
      fingerprint: { projects: projects.fingerprint, properties: properties.fingerprint },
      projects: { ...projects.section, years: projects.section.years?.years ?? [] },
      properties: properties.section,
    });
    snapshot.media = await copyMedia(mediaQueue([projects.section, properties.section]));
    log(
      `${projects.section.items.length} proyectos y ${properties.section.items.length} propiedades guardados`,
    );
  } catch (error) {
    Object.assign(snapshot, { status: 'failed', error: String(error.message).slice(0, 200) });
    log(`no se pudo generar la copia: ${snapshot.error}. El build continúa sin ella.`);
  }
  snapshot.generatedAt = new Date().toISOString();
  await writeFile(join(outDir, 'catalog-snapshot.json'), JSON.stringify(snapshot));
}

main().catch((error) => log(`error inesperado: ${error.message}`));
