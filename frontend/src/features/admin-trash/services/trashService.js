import { apiRequest } from '../../../services/apiClient.js';
import { readTrashPage, trashIdentifier, validTrashType } from '../utils/trash.js';

async function mutate(type, id, action, method, token) {
  const key = trashIdentifier(type, id);
  const result = await apiRequest(`admin/${type}/${key}/${action}/`, { method, token });
  if (result !== null) throw new Error('El servidor no confirmó la operación con la respuesta esperada.');
}
export const trashService = {
  async list(type, page, token, { signal } = {}) {
    if (!validTrashType(type) || !Number.isInteger(page) || page < 1) throw new Error('Consulta de papelera inválida.');
    const query = new URLSearchParams({ type, page: String(page), page_size: '12' });
    return readTrashPage(await apiRequest(`admin/trash/?${query}`, { token, signal }), type);
  },
  restore: (type, id, token) => mutate(type, id, 'restore', 'POST', token),
  remove: (type, id, token) => mutate(type, id, 'permanent', 'DELETE', token),
};
