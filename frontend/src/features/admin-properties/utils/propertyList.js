// Lógica pura del listado administrativo de Bienes Raíces (con pruebas en tests/).
import { queryString } from '../../projects/services/catalogMapper.js';

export const PROPERTY_PAGE_SIZE = 12;

export const propertyStatusFilters = Object.freeze([
  { value: 'all', label: 'Todos los estados' },
  { value: 'published', label: 'Publicadas' },
  { value: 'draft', label: 'Borradores' },
]);

const ALLOWED_QUERY = ['q', 'operation', 'type', 'zone', 'sort', 'page', 'page_size'];

// El estado (publicada/borrador) NO se envía: la API aún no lo filtra (BE-22).
export function buildPropertyQuery({ q = '', operation = '', type = '', zone = '', sort = '', page = 1 } = {}) {
  return queryString({ q: q.trim(), operation, type, zone, sort, page, page_size: PROPERTY_PAGE_SIZE }, ALLOWED_QUERY);
}

export function filterByStatus(items, status) {
  if (status === 'published') return items.filter((item) => item.published === true);
  if (status === 'draft') return items.filter((item) => item.published === false);
  return items;
}

export const statusLabel = (item) => {
  const base = item.published ? 'Publicada' : 'Borrador';
  return item.demo ? `Ejemplo · ${base}` : base;
};

export function formatPropertyPrice(item) {
  const amount = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(item.price);
  return `Q ${amount}${item.operation === 'Alquiler' ? ' / mes' : ''}`;
}

export function formatPropertyDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return '—';
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export const totalPages = (count) => Math.max(1, Math.ceil(count / PROPERTY_PAGE_SIZE));

// Mensaje en español según el error de la API (sin exponer detalles técnicos).
export function describePropertyError(error, action) {
  const status = error?.status;
  if (status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.';
  if (status === 403) return error?.message && !/^Error HTTP/.test(error.message)
    ? error.message
    : `Tu rol no tiene permiso para ${action}.`;
  if (status === 404) return 'La propiedad ya no existe o cambió de estado. Actualiza la lista.';
  if (status === 429) return 'Demasiados intentos seguidos. Espera un momento e intenta de nuevo.';
  if (status === 501) return `El servidor aún no tiene disponible la operación para ${action}.`;
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  return `No se pudo ${action}. Intenta de nuevo.`;
}
