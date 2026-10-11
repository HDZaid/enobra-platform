import { apiRequest } from '../../../services/apiClient.js';

export const inquiriesService = {
  list: (params = {}, token) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`inquiries/${query ? `?${query}` : ''}`, { token });
  },
  get: (id, token) => apiRequest(`inquiries/${encodeURIComponent(id)}/`, { token }),
  updateStatus: (id, status, token) => apiRequest(`inquiries/${encodeURIComponent(id)}/`, {
    method: 'PATCH', body: { status }, token,
  }),
};
