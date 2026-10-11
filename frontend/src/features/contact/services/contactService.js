import { apiRequest } from '../../../services/apiClient.js';

export const contactService = {
  send: (data) => apiRequest('inquiries/contact/', { method: 'POST', body: data }),
};
