import { apiRequest } from '../../../services/apiClient.js';

export const usersService = {
  list: ({ q = '', page = 1, page_size = 12 } = {}, token, signal) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
    if (q.trim()) params.set('q', q.trim());
    return apiRequest(`admin/users/?${params}`, { token, signal });
  },
  roles: (token, signal) => apiRequest('admin/users/roles/', { token, signal }),
  create: (data, token) => apiRequest('admin/users/', { method: 'POST', body: data, token }),
};
