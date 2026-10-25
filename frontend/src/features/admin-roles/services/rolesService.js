import { apiRequest } from '../../../services/apiClient.js';

const rolePath = (id) => `admin/roles/${encodeURIComponent(id)}/`;

export const rolesService = {
  list: (token, signal) => apiRequest('admin/roles/', { token, signal }),
  permissions: (token, signal) => apiRequest('admin/permissions/', { token, signal }),
  get: (id, token, signal) => apiRequest(rolePath(id), { token, signal }),
  create: (data, token) => apiRequest('admin/roles/', { method: 'POST', body: data, token }),
  update: (id, data, token) => apiRequest(rolePath(id), { method: 'PATCH', body: data, token }),
};
