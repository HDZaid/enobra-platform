import { apiRequest } from '../../../services/apiClient.js';

export function readContactReceipt(receipt) {
  if (!receipt || typeof receipt.id !== 'string' || !receipt.id.trim() ||
      !['nuevo', 'atendido', 'archivado'].includes(receipt.status) ||
      typeof receipt.created_at !== 'string' || !Number.isFinite(Date.parse(receipt.created_at))) {
    throw new TypeError('Django no devolvió un acuse válido. No se pudo confirmar el envío.');
  }
  return receipt;
}

export const contactService = {
  async send(data) {
    return readContactReceipt(await apiRequest('inquiries/contact/', { method: 'POST', body: data }));
  },
};
