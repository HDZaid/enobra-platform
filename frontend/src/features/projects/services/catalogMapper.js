// Shared contract helpers for the two public catalog modules.
export function mediaUrl(value) {
  if (typeof value !== 'string') return '';
  if (/^\/media\/[\w./-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

// Espejo de VideoReferenceField (backend/apps/common/fields.py). El contrato solo admite
// enlaces HTTPS de YouTube (tablas proyecto_video y propiedad_video, columna url_youtube).
// No hay soporte MP4/WebM: añadirlo exige cambiar antes el contrato del backend.
const YOUTUBE_AUTHORITY = /^(?:(?:www\.|m\.)?youtube\.com|youtu\.be)(?::443)?$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Devuelve { id, watchUrl, embedUrl } o null. Las URL de salida se construyen solo con el ID
// validado: nunca se reutilizan el host, la ruta ni los parámetros del enlace recibido.
export function parseYoutube(value) {
  if (typeof value !== 'string' || value.length > 500) return null;
  // Espacios, caracteres de control y "\" se rechazan: los analizadores de URL difieren en ellos.
  if ([...value].some((char) => char <= ' ' || char === '\u007f' || char === '\\')) return null;
  const [base, ...queryParts] = value.split('#')[0].split('?');
  const match = /^https:\/\/([^/]*)(\/.*)?$/i.exec(base);
  if (!match || !YOUTUBE_AUTHORITY.test(match[1])) return null;
  const host = match[1].toLowerCase().replace(/:443$/, '');
  const path = match[2] ?? '';
  let id = '';
  if (host === 'youtu.be') id = path.slice(1);
  else if (path === '/watch')
    id = new URLSearchParams(queryParts.join('?')).getAll('v').find(Boolean) ?? '';
  else if (path.startsWith('/embed/') || path.startsWith('/shorts/')) id = path.split('/').pop();
  if (!YOUTUBE_ID.test(id)) return null;
  return {
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}

export function mapMedia(item) {
  return {
    images: Array.isArray(item.images) ? item.images.map(mediaUrl) : [],
    renders: Array.isArray(item.renders) ? item.renders.map(mediaUrl) : [],
    video: parseYoutube(item.video) ? item.video : '',
  };
}

export function requireFields(item, textFields, numberFields = []) {
  if (
    !item ||
    !textFields.every((key) => typeof item[key] === 'string') ||
    !numberFields.every((key) => Number.isInteger(item[key]) && item[key] >= 0) ||
    typeof item.demo !== 'boolean' ||
    typeof item.published !== 'boolean'
  ) {
    throw new Error('La respuesta no corresponde al contrato del catálogo.');
  }
}

export function mapPage(payload, mapper) {
  if (
    !payload ||
    !Array.isArray(payload.results) ||
    !Number.isInteger(payload.count) ||
    payload.count < 0 ||
    !Number.isInteger(payload.page) ||
    payload.page < 1 ||
    !Number.isInteger(payload.page_size) ||
    payload.page_size < 1
  ) {
    throw new Error('La respuesta no corresponde al contrato del catálogo.');
  }
  return { ...payload, results: payload.results.map(mapper).filter((item) => item.published) };
}

export function queryString(params, allowed) {
  const query = new URLSearchParams();
  allowed.forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '')
      query.set(key, params[key]);
  });
  return query.size ? `?${query}` : '';
}
