import { apiRequest, ApiError } from '../../../services/apiClient.js';
import {
  mapMedia,
  mapPage,
  queryString,
  requireFields,
} from '../../projects/services/catalogMapper.js';

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
