import { apiRequest } from '../../../services/apiClient.js';

// El almacenamiento seguro de la sesión se definirá junto con el backend.
// No se guardan tokens de autenticación en localStorage en esta base.
export const authService = {
  login: (credentials) => apiRequest('auth/login/', { method: 'POST', body: credentials }),
  me: (token) => apiRequest('auth/me/', { token }),
  refresh: (refresh) => apiRequest('auth/refresh/', {
    method: 'POST', body: { refresh },
  }),
  logout: (refresh, token) => apiRequest('auth/logout/', {
    method: 'POST', body: { refresh }, token,
  }),
};
