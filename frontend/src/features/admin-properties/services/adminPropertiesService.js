import { apiRequest } from '../../../services/apiClient.js';
import { mapMedia, requireFields } from '../../projects/services/catalogMapper.js';
import { propertiesService } from '../../properties/services/propertiesService.js';
import { buildPropertyQuery } from '../utils/propertyList.js';

// A diferencia del catálogo público (`mapPage` descarta los borradores), el panel
// necesita ver publicadas y borradores.
export function mapAdminProperty(item) {
  requireFields(
    item,
    ['title', 'operation', 'type', 'zone', 'location', 'date', 'description', 'commercial'],
    ['id', 'price', 'rooms', 'baths', 'parking', 'area'],
  );
  if (item.id < 1) throw new Error('Identificador de propiedad inválido.');
  return { ...item, ...mapMedia(item) };
}

export function mapAdminPage(payload) {
  if (
    !payload || !Array.isArray(payload.results) ||
    !Number.isInteger(payload.count) || payload.count < 0 ||
    !Number.isInteger(payload.page) || payload.page < 1
  ) {
    throw new Error('La respuesta no corresponde al contrato del catálogo.');
  }
  return { ...payload, results: payload.results.map(mapAdminProperty) };
}

const assertId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) throw new TypeError('Identificador de propiedad inválido.');
};

export const adminPropertiesService = {
  // A diferencia de propertiesService.get, no oculta los borradores: el panel debe poder editarlos.
  async get(id, token, options = {}) {
    assertId(id);
    return mapAdminProperty(await apiRequest(`properties/${id}/`, { ...options, token }));
  },
  async create(body, token) {
    return mapAdminProperty(await apiRequest('properties/', { method: 'POST', body, token }));
  },
  // PATCH con la ficha completa del formulario; el backend valida también las reglas por tipo.
  async update(id, body, token) {
    assertId(id);
    return mapAdminProperty(await apiRequest(`properties/${id}/`, { method: 'PATCH', body, token }));
  },
  // Con token, el backend incluye borradores (todos o solo los propios según el rol).
  async list(filters, token, options = {}) {
    return mapAdminPage(await apiRequest(`properties/${buildPropertyQuery(filters)}`, { ...options, token }));
  },
  facets: (options = {}) => propertiesService.facets(options),
  // PATCH parcial: no reenvía ni reemplaza el resto de la ficha.
  async setPublished(id, published, token) {
    assertId(id);
    if (typeof published !== 'boolean') throw new TypeError('Estado de publicación inválido.');
    return mapAdminProperty(await apiRequest(`properties/${id}/`, { method: 'PATCH', body: { published }, token }));
  },
  // DELETE envía a la papelera (restaurable). No borra de forma definitiva.
  async trash(id, token) {
    assertId(id);
    await apiRequest(`properties/${id}/`, { method: 'DELETE', token });
  },
};
