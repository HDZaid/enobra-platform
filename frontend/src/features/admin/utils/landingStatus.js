import { apiRequest } from '../../../services/apiClient.js';
import { catalogCache } from '../../../services/catalogCache.js';
import {
  CATALOG_KINDS,
  catalogFingerprint,
  latestUpdate,
} from '../../../services/catalogSnapshot.js';

// Tras publicar, el sitio público tarda unos minutos en reconstruirse.
export const LANDING_GRACE = 15 * 60 * 1000;

const labels = { projects: 'Proyectos', properties: 'Bienes raíces' };

// Compara la copia estática del sitio público con lo publicado en la API.
// Devuelve { state, generatedAt, kinds }:
//   ok        la copia coincide con lo publicado
//   updating  hay cambios de hace menos de 15 min (el despliegue puede estar en curso)
//   stale     hay cambios que la copia no tiene
//   failed    el último despliegue no pudo leer el backend
//   missing   el sitio publicado no tiene copia
export function compareLanding(snapshot, live, now = Date.now()) {
  if (!snapshot) return { state: 'missing', generatedAt: null, kinds: [] };
  const generatedAt = snapshot.generatedAt;
  if (snapshot.status !== 'ok') return { state: 'failed', generatedAt, kinds: [] };
  const changed = CATALOG_KINDS.filter(
    (kind) => live[kind] && catalogFingerprint(live[kind]) !== snapshot.fingerprint?.[kind],
  );
  if (!changed.length) return { state: 'ok', generatedAt, kinds: [] };
  const latest = Math.max(...changed.map((kind) => latestUpdate(live[kind]) ?? 0));
  const recent = latest > Date.parse(generatedAt) && now - latest < LANDING_GRACE;
  return { state: recent ? 'updating' : 'stale', generatedAt, kinds: changed.map((k) => labels[k]) };
}

export function landingMessage(result) {
  const date = result.generatedAt
    ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(result.generatedAt),
      )
    : '';
  switch (result.state) {
    case 'failed':
      return `El sitio público no se está actualizando: la actualización del ${date} no se completó. Algunos visitantes podrían tardar más en ver el catálogo.`;
    case 'stale':
      return `El sitio público no se está actualizando: muestra la copia del ${date}. Los cambios recientes en ${result.kinds.join(' y ')} tardarán en verse para los visitantes nuevos hasta la próxima actualización del sitio.`;
    case 'updating':
      return `Actualizando el sitio público con los cambios en ${result.kinds.join(' y ')}. Puede tardar unos minutos.`;
    case 'missing':
      return 'El catálogo puede tardar en cargar al abrir el sitio público.';
    default:
      return '';
  }
}

// Consulta pública (sin token) para comparar exactamente lo que ve un visitante.
export async function checkLanding({ signal } = {}) {
  const [snapshot, ...pages] = await Promise.all([
    catalogCache.loadSnapshot({ fresh: true }),
    ...CATALOG_KINDS.map((kind) =>
      apiRequest(`${kind}/?page_size=100`, { signal }).catch(() => null),
    ),
  ]);
  const live = Object.fromEntries(CATALOG_KINDS.map((kind, index) => [kind, pages[index]]));
  return compareLanding(snapshot, live);
}
