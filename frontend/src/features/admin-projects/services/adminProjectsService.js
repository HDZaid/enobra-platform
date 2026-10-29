import { apiRequest } from '../../../services/apiClient.js';
import { mapProject, projectsService } from '../../projects/services/projectsService.js';
import { PROJECT_TRASH_ENABLED } from '../utils/projects.js';

const detail = (slug) => {
  if (!/^[-a-zA-Z0-9_]+$/.test(slug || '')) throw new TypeError('Identificador de proyecto inválido.');
  return `projects/${encodeURIComponent(slug)}/`;
};
export const adminProjectsService = {
  async list({ page = 1, year = '' } = {}, token, options = {}) {
    const query = new URLSearchParams({ page, page_size: 12 });
    if (year) query.set('year', year);
    const payload = await apiRequest(`projects/?${query}`, { ...options, token });
    if (!Array.isArray(payload?.results) || !Number.isInteger(payload.count) || payload.count < 0 || !Number.isInteger(payload.page) || payload.page < 1) throw new TypeError('Respuesta de proyectos inválida.');
    return { ...payload, results: payload.results.map(mapProject) };
  },
  // No utiliza el get público que convierte los borradores en 404.
  async get(slug, token, options = {}) { return mapProject(await apiRequest(detail(slug), { ...options, token })); },
  years: (token, options = {}) => projectsService.years({ ...options, token }),
  async create(body, token) { return mapProject(await apiRequest('projects/', { method: 'POST', body, token })); },
  async update(slug, body, token) { return mapProject(await apiRequest(detail(slug), { method: 'PATCH', body, token })); },
  async setPublished(slug, published, token) {
    if (typeof published !== 'boolean') throw new TypeError('Estado inválido.');
    return this.update(slug, { published }, token);
  },
  async trash(slug, token) {
    if (!PROJECT_TRASH_ENABLED) throw new Error('La papelera de proyectos aún no está habilitada en este frontend.');
    const result = await apiRequest(detail(slug), { method: 'DELETE', token });
    if (result !== null) throw new Error('El servidor no confirmó el envío a papelera.');
  },
};
