import { apiRequest } from '../../../services/apiClient.js';

export const newsService = {
  list: (params = {}, options = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`news/${query ? `?${query}` : ''}`, options);
  },
  get: (slug, options = {}) => apiRequest(`news/${encodeURIComponent(slug)}/`, options),
  create: (data, token) => apiRequest('news/', { method: 'POST', body: data, token }),
  update: (slug, data, token) => apiRequest(`news/${encodeURIComponent(slug)}/`, {
    method: 'PATCH', body: data, token,
  }),
  remove: (slug, token) => apiRequest(`news/${encodeURIComponent(slug)}/`, {
    method: 'DELETE', token,
  }),
};
