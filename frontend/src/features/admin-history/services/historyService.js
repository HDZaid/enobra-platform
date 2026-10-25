import { apiRequest } from '../../../services/apiClient.js';
import { historyQuery, readHistoryPage } from '../utils/history.js';

export const historyService = {
  async list(filters, { page = 1, allowUser = false, token, signal } = {}) {
    return readHistoryPage(await apiRequest(`admin/audit/?${historyQuery(filters, { page, allowUser })}`, { token, signal }));
  },
  async exportCsv(filters, { allowUser = false, token, signal } = {}) {
    const text = await apiRequest(`admin/audit/export/?${historyQuery(filters, { allowUser })}`, { token, signal });
    if (typeof text !== 'string' || !text.replace(/^\uFEFF/, '').startsWith('id,user_id,user_name,action,module,record_id,record_name,description,date')) {
      throw new Error('El servidor no devolvió un CSV de historial válido.');
    }
    return text;
  },
};
