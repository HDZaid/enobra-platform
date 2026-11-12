import { apiRequest, ApiError } from '../../../services/apiClient.js';
import { mapMedia, mapPage, queryString, requireFields } from './catalogMapper.js';
import {
  createOfflineResource,
  snapshotDetail,
  snapshotExtra,
  snapshotList,
} from './catalogOffline.js';

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

// Recursos del sitio público con caché local y copia estática (catalogOffline.js).
export const publicProjects = {
  list: createOfflineResource({
    name: 'projects:list',
    loader: (query, options) =>
      projectsService.list(Object.fromEntries(new URLSearchParams(query)), options),
    // Solo el listado sin filtro de año se puede armar desde la copia.
    fromSnapshot: (snapshot, query) => {
      const params = new URLSearchParams(query);
      return snapshotList('projects', mapProject)(snapshot, {
        page: Number(params.get('page') || 1),
        filtered: Boolean(params.get('year')),
      });
    },
  }),
  detail: createOfflineResource({
    name: 'projects:item',
    loader: (slug, options) => projectsService.get(slug, options),
    fromSnapshot: snapshotDetail('projects', mapProject),
  }),
  years: createOfflineResource({
    name: 'projects:years',
    loader: (_key, options) => projectsService.years(options),
    fromSnapshot: (snapshot) => {
      const years = snapshotExtra(snapshot, 'projects', 'years');
      return Array.isArray(years) && years.every(Number.isInteger)
        ? [...new Set(years)].sort((a, b) => b - a)
        : null;
    },
  }),
};
