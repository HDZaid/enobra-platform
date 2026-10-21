import { apiRequest, ApiError } from '../../../services/apiClient.js';
import { mapMedia, mapPage, queryString, requireFields } from './catalogMapper.js';

export function mapProject(item) {
  requireFields(item, ['id', 'title', 'category', 'country', 'description'], ['year']);
  if (!/^[-a-zA-Z0-9_]+$/.test(item.id)) throw new Error('Identificador de proyecto inválido.');
  return { ...item, ...mapMedia(item) };
}

export const projectsService = {
  async list(params = {}, options = {}) {
    return mapPage(
      await apiRequest(`projects/${queryString(params, ['year', 'page', 'page_size'])}`, options),
      mapProject,
    );
  },
  async get(slug, options = {}) {
    if (!/^[-a-zA-Z0-9_]+$/.test(slug || '')) throw new ApiError('Proyecto no encontrado.', 404);
    const item = mapProject(await apiRequest(`projects/${encodeURIComponent(slug)}/`, options));
    if (!item.published) throw new ApiError('Proyecto no encontrado.', 404);
    return item;
  },
  async years(options = {}) {
    const data = await apiRequest('projects/years/', options);
    if (!Array.isArray(data?.years) || !data.years.every(Number.isInteger))
      throw new Error('Años no disponibles.');
    return [...new Set(data.years)].sort((a, b) => b - a);
  },
};
