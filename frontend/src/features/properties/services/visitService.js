import { apiRequest } from '../../../services/apiClient.js';

export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function validateVisit(values, today = todayLocal()) {
  const errors = {};
  if (!values.name?.trim() || values.name.trim().length > 120)
    errors.name = 'Ingresa tu nombre (máximo 120 caracteres).';
  if (!/^\d{8}$/.test((values.phone || '').replace(/[\s-]/g, '')))
    errors.phone = 'Ingresa un teléfono de Guatemala de 8 dígitos.';
  const date = values.preferred_date || '';
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    date < today
  )
    errors.preferred_date = 'Elige hoy o una fecha futura válida.';
  return errors;
}

export async function requestVisit(propertyId, values, options = {}) {
  if (
    !Number.isSafeInteger(propertyId) ||
    propertyId < 1 ||
    Object.keys(validateVisit(values)).length
  )
    throw new Error('Revisa los datos de la solicitud.');
  const receipt = await apiRequest('inquiries/visits/', {
    ...options,
    method: 'POST',
    body: {
      property_id: propertyId,
      name: values.name.trim(),
      phone: values.phone.replace(/[\s-]/g, ''),
      preferred_date: values.preferred_date,
    },
  });
  if (
    !receipt ||
    typeof receipt.id !== 'string' ||
    !receipt.id ||
    !['nuevo', 'atendido', 'archivado'].includes(receipt.status) ||
    typeof receipt.created_at !== 'string'
  )
    throw new Error('El servidor no devolvió una confirmación válida.');
  return receipt;
}
