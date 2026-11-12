import { catalogItemPath } from './catalogItemPath.js';
import { SNAPSHOT_PATH, snapshotItem, withLocalMedia } from './catalogSnapshot.js';

const apiTimeout = 2000;

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));
}

function coverUrl(src, origin) {
  if (typeof src !== 'string' || !src) return '';
  try {
    const url = new URL(src, origin);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

async function findItem(env, origin, kind, id) {
  try {
    const response = await env.ASSETS.fetch(new URL(SNAPSHOT_PATH, origin));
    if (response.ok) {
      const snapshot = await response.json();
      const item = snapshotItem(snapshot, kind, id);
      if (item?.published) return withLocalMedia(item, snapshot.media);
    }
  } catch {
    // Una copia ausente o incompleta no impide abrir la ficha.
  }

  const api = env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  if (!api?.startsWith('https://')) return null;
  try {
    const response = await fetch(`${api}/${kind}/${encodeURIComponent(id)}/`, {
      signal: AbortSignal.timeout(apiTimeout),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export async function catalogLinkPreview({ request, params, env, next }, kind) {
  const response = await next();
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) return response;

  const id = params.id;
  const validId = kind === 'projects' ? /^[-a-zA-Z0-9_]+$/ : /^[1-9]\d*$/;
  if (typeof id !== 'string' || !validId.test(id)) return response;

  const { origin } = new URL(request.url);
  const item = await findItem(env, origin, kind, id);
  if (item?.published !== true || typeof item.title !== 'string' || !item.title.trim()) return response;

  const description = typeof item.description === 'string'
    ? item.description.replace(/\s+/g, ' ').trim().slice(0, 180)
    : '';
  const image = coverUrl(item.images?.[0], origin);
  const url = new URL(catalogItemPath(kind, id), origin).href;
  const properties = {
    'og:type': 'website',
    'og:site_name': 'EnObra',
    'og:title': item.title,
    'og:description': description,
    'og:url': url,
    'og:image': image,
    'og:image:alt': image ? `Portada de ${item.title}` : '',
  };
  const tags = Object.entries(properties)
    .filter(([, value]) => value)
    .map(([key, value]) => `<meta property="${key}" content="${escapeHtml(value)}">`)
    .join('\n');
  const html = (await response.text()).replace('</head>', () => `${tags}\n</head>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(html, { status: response.status, headers });
}
