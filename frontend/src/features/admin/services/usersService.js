import { apiRequest } from '../../../services/apiClient.js';
import { readManagedUser } from '../utils/users.js';
import { readAdminCollection } from '../utils/adminData.js';

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

// El servidor pagina la búsqueda, pero no admite filtrar por estado.
export async function listTeamUsers({ q, active }, token, signal) {
  const pageSize = 100;
  const members = [];
  let remaining;
  let page = 1;
  do {
    const { items, count } = readAdminCollection(await usersService.list({ q, page, page_size: pageSize }, token, signal));
    for (const item of items) {
      const user = readManagedUser(item);
      const email = user.email.toLowerCase();
      const internal = email.endsWith('.invalid') || email === 'admin@enobra.local';
      if (!internal && user.active === active) members.push(user);
    }
    remaining = count - page * pageSize;
    page += 1;
  } while (remaining > 0);
  return members;
}

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
