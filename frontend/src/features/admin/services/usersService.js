import { apiRequest } from '../../../services/apiClient.js';
import { readManagedUser } from '../utils/users.js';

const userPath = (id) => `admin/users/${encodeURIComponent(id)}/`;

export const usersService = {
  list: ({ q = '', page = 1, page_size = 12 } = {}, token, signal) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
    if (q.trim()) params.set('q', q.trim());
    return apiRequest(`admin/users/?${params}`, { token, signal });
  },
  roles: (token, signal) => apiRequest('admin/users/roles/', { token, signal }),
  create: (data, token) => apiRequest('admin/users/', { method: 'POST', body: data, token }),
  update: (id, data, token) => apiRequest(userPath(id), { method: 'PATCH', body: data, token }),
  replaceRole: (id, role_id, token) => apiRequest(`${userPath(id)}role/`, { method: 'PUT', body: { role_id }, token }),
};

// Los endpoints son transacciones independientes: conservar el resultado confirmado
// para que un reintento no repita los datos ya guardados si falla el cambio de rol.
export async function saveUserChanges(user, changes, token) {
  let saved = user;
  const completed = [];
  const steps = [];
  if (Object.keys(changes.data).length) steps.push(['data', () => usersService.update(user.id, changes.data, token)]);
  if (changes.role_id !== undefined) steps.push(['role', () => usersService.replaceRole(user.id, changes.role_id, token)]);
  for (const [step, write] of steps) {
    try {
      saved = readManagedUser(await write());
      completed.push(step);
    } catch (error) {
      return { user: saved, completed, failed: { step, error } };
    }
  }
  return { user: saved, completed, failed: null };
}
