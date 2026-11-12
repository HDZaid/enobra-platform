import { apiRequest, ApiError } from '../../../services/apiClient.js';
import {
  mapMedia,
  mapPage,
  queryString,
  requireFields,
} from '../../projects/services/catalogMapper.js';
import {
  createOfflineResource,
  snapshotDetail,
  snapshotExtra,
  snapshotList,
} from '../../projects/services/catalogOffline.js';

export function mapProperty(item) {
  requireFields(
    item,
    ['title', 'operation', 'type', 'zone', 'location', 'date', 'description', 'commercial'],
    ['id', 'price', 'rooms', 'baths', 'parking', 'area'],
  );
  if (item.id < 1) throw new Error('Identificador de propiedad inválido.');
  return { ...item, ...mapMedia(item) };
}

export function formatPrice(item) {
  return `Q ${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(item.price)}${item.operation === 'Alquiler' ? ' / mes' : ''}`;
}

export const propertiesService = {
  async list(params = {}, options = {}) {
    const allowed = [
      'operation',
      'type',
      'zone',
      'q',
      'min_price',
      'max_price',
      'sort',
      'ids',
      'page',
      'page_size',
    ];
    return mapPage(
      await apiRequest(`properties/${queryString(params, allowed)}`, options),
      mapProperty,
    );
  },
  async get(id, options = {}) {
    if (!/^[1-9]\d*$/.test(String(id))) throw new ApiError('Propiedad no encontrada.', 404);
    const item = mapProperty(await apiRequest(`properties/${encodeURIComponent(id)}/`, options));
    if (!item.published) throw new ApiError('Propiedad no encontrada.', 404);
    return item;
  },
  async facets(options = {}) {
    const data = await apiRequest('properties/facets/', options);
    if (
      !data ||
      !['zones', 'types', 'operations'].every(
        (key) => Array.isArray(data[key]) && data[key].every((value) => typeof value === 'string'),
      )
    )
      throw new Error('Filtros no disponibles.');
    return data;
  },
};

const DEFAULT_QUERY_KEYS = new Set(['page', 'sort']);

// Recursos del sitio público con caché local y copia estática (catalogOffline.js).
// La clave del listado es el JSON que arma PropertiesPage ({ query, invalid, emptyFavorites }).
export const publicProperties = {
  list: createOfflineResource({
    name: 'properties:list',
    loader: (key, options) => {
      const { query, invalid, emptyFavorites } = JSON.parse(key);
      if (invalid || emptyFavorites)
        return Promise.resolve({ count: 0, page: 1, page_size: 12, results: [] });
      return propertiesService.list(query, options);
    },
    // Solo el listado sin filtros (orden "más recientes") se puede armar desde la copia.
    fromSnapshot: (snapshot, key) => {
      const { query = {}, invalid, emptyFavorites } = JSON.parse(key);
      if (invalid || emptyFavorites) return null;
      const filtered =
        Object.keys(query).some((name) => !DEFAULT_QUERY_KEYS.has(name)) ||
        (query.sort !== undefined && query.sort !== 'recent');
      return snapshotList('properties', mapProperty)(snapshot, {
        page: Number(query.page || 1),
        filtered,
      });
    },
  }),
  detail: createOfflineResource({
    name: 'properties:item',
    loader: (id, options) => propertiesService.get(id, options),
    fromSnapshot: snapshotDetail('properties', mapProperty),
  }),
  facets: createOfflineResource({
    name: 'properties:facets',
    loader: (_key, options) => propertiesService.facets(options),
    fromSnapshot: (snapshot) => {
      const facets = snapshotExtra(snapshot, 'properties', 'facets');
      return facets &&
        ['zones', 'types', 'operations'].every(
          (name) => Array.isArray(facets[name]) && facets[name].every((v) => typeof v === 'string'),
        )
        ? facets
        : null;
    },
  }),
};
