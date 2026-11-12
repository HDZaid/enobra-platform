// Copia estática del catálogo público que se genera al desplegar (scripts/snapshot-catalog.mjs).
// Sirve para mostrar Proyectos y Bienes raíces al instante mientras el backend despierta.
// Este módulo es puro: lo usan el navegador y el script de Node, sin import.meta.env ni DOM.

export const SNAPSHOT_PATH = '/data/catalog-snapshot.json';
export const SNAPSHOT_MEDIA_DIR = '/data/media/';
export const SNAPSHOT_ITEM_LIMIT = 20;
export const SNAPSHOT_VERSION = 1;
export const CATALOG_KINDS = ['projects', 'properties'];

// Huella de lo publicado: cambia al crear, editar, publicar, retirar o enviar a papelera.
export function catalogFingerprint(page) {
  if (!page || !Array.isArray(page.results) || !Number.isInteger(page.count)) return '';
  const latest = page.results
    .map((item) => (typeof item?.updated_at === 'string' ? item.updated_at : ''))
    .sort()
    .pop();
  return `${page.count}|${latest || ''}`;
}

export function latestUpdate(page) {
  const values = (page?.results || [])
    .map((item) => Date.parse(item?.updated_at))
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

export function isSnapshot(value) {
  return Boolean(
    value &&
      value.version === SNAPSHOT_VERSION &&
      typeof value.generatedAt === 'string' &&
      ['ok', 'failed'].includes(value.status),
  );
}

function section(snapshot, kind) {
  const data = snapshot?.status === 'ok' ? snapshot[kind] : null;
  if (
    !data ||
    !Array.isArray(data.items) ||
    !Number.isInteger(data.count) ||
    !Number.isInteger(data.pageSize) ||
    data.pageSize < 1
  )
    return null;
  return data;
}

// Página "cruda" (como la devuelve la API) a partir de la copia, o null si la copia no la cubre.
// Solo responde el listado sin filtros; un filtro distinto espera a la API.
export function snapshotPage(snapshot, kind, { page = 1, filtered = false } = {}) {
  const data = section(snapshot, kind);
  if (!data || filtered || !Number.isInteger(page) || page < 1) return null;
  const start = (page - 1) * data.pageSize;
  const end = Math.min(start + data.pageSize, data.count);
  if (start >= data.count && data.count > 0) return null;
  if (end > data.items.length) return null;
  return {
    count: data.count,
    page,
    page_size: data.pageSize,
    results: data.items.slice(start, end),
    partial: data.items.length < data.count,
  };
}

export function snapshotItem(snapshot, kind, id) {
  const data = section(snapshot, kind);
  return data?.items.find((item) => String(item?.id) === String(id)) || null;
}

export function snapshotExtra(snapshot, kind, name) {
  return section(snapshot, kind)?.[name] ?? null;
}

// Reemplaza las URL de imágenes por su copia estática, si existe.
export function withLocalMedia(item, media) {
  if (!item || !media || typeof media !== 'object') return item;
  const swap = (list) =>
    Array.isArray(list)
      ? list.map((url) => {
          const local = media[url];
          return typeof local === 'string' && local.startsWith(SNAPSHOT_MEDIA_DIR) ? local : url;
        })
      : list;
  return { ...item, images: swap(item.images), renders: swap(item.renders) };
}

export function presentWithMedia(data, media) {
  if (!data || !media) return data;
  if (Array.isArray(data.results))
    return { ...data, results: data.results.map((item) => withLocalMedia(item, media)) };
  if (Array.isArray(data.images)) return withLocalMedia(data, media);
  return data;
}
