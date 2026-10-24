import { hasAdminPermission } from '../../admin/utils/adminData.js';

export const historyModules = { properties: 'Bienes Raíces', projects: 'Proyectos', news: 'Noticias', users: 'Usuarios', roles: 'Roles', media: 'Imágenes', inquiries: 'Mensajes' };
export const historyActions = { CREAR: 'Crear', EDITAR: 'Editar', ELIMINAR: 'Eliminar', PAPELERA: 'Enviar a papelera', RESTAURAR: 'Restaurar', ELIMINAR_PERMANENTE: 'Eliminar definitivamente', ESTADO: 'Cambiar estado', ROL: 'Cambiar rol' };
export const moduleLabel = (value) => Object.hasOwn(historyModules, value) ? historyModules[value] : value;
export const actionLabel = (value) => Object.hasOwn(historyActions, value) ? historyActions[value] : value;
export const emptyHistoryFilters = () => ({ q: '', module: '', action: '', user_id: '', date_from: '', date_to: '' });
export function historyPermissions(user) {
  return { read: hasAdminPermission(user, 'audit.read'), export: hasAdminPermission(user, 'audit.export'),
    users: ['users.read', 'users.manage'].some((permission) => hasAdminPermission(user, permission)) };
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateHistoryFilters(filters) {
  if (filters.user_id && !/^[1-9]\d*$/.test(filters.user_id)) return 'El ID del usuario debe ser un entero mayor que cero.';
  if (['date_from', 'date_to'].some((key) => filters[key] && !validDate(filters[key]))) return 'Ingresa fechas válidas.';
  if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) return 'La fecha final debe ser igual o posterior a la inicial.';
  return '';
}
export function historyQuery(filters, { page, allowUser = false } = {}) {
  const cleaned = Object.fromEntries(Object.keys(emptyHistoryFilters()).map((key) => [key, String(filters[key] ?? '').trim()]));
  if (!allowUser) cleaned.user_id = '';
  const error = validateHistoryFilters(cleaned);
  if (error) throw new Error(error);
  const params = new URLSearchParams();
  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) throw new Error('Página inválida.');
    params.set('page', String(page)); params.set('page_size', '12');
  }
  Object.entries(cleaned).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}
export function readHistoryPage(data) {
  if (!data || !Number.isInteger(data.count) || data.count < 0 || !Number.isInteger(data.page) || data.page < 1 ||
    !Number.isInteger(data.page_size) || data.page_size < 1 || !Array.isArray(data.results) || data.results.length > data.count || data.results.length > data.page_size) throw new Error('Respuesta de historial inválida.');
  const results = data.results.map((item) => {
    if (!item || !Number.isInteger(item.id) || !Number.isInteger(item.user?.id) || typeof item.user.name !== 'string' ||
      !['action', 'module', 'date'].every((key) => typeof item[key] === 'string') || !Number.isFinite(Date.parse(item.date)) ||
      !(item.record_id === null || Number.isInteger(item.record_id)) ||
      !['record_name', 'description'].every((key) => item[key] === null || typeof item[key] === 'string')) throw new Error('Evento de historial inválido.');
    return { id: item.id, user: { id: item.user.id, name: item.user.name }, action: item.action, module: item.module,
      record_id: item.record_id, record_name: item.record_name, description: item.description, date: item.date };
  });
  return { count: data.count, page: data.page, page_size: data.page_size, results };
}
export function formatHistoryDate(value) {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function historyFilename(date = new Date()) {
  return `historial-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.csv`;
}
export function actionColor(action) {
  if (['ELIMINAR', 'ELIMINAR_PERMANENTE'].includes(action)) return 'bg-[#fdeaea] text-[#9c2929]';
  if (['CREAR', 'RESTAURAR'].includes(action)) return 'bg-[#e6f4ec] text-[#1f704a]';
  if (action === 'PAPELERA') return 'bg-[#fff1e5] text-[#88420d]';
  return 'bg-[#edf2f8] text-[#304e7d]';
}
// Exclusivos del modo de demostración; nunca reemplazan una respuesta real.
export const previewHistory = Array.from({ length: 15 }, (_, index) => ({
  id: 15 - index, user: { id: index % 2 + 1, name: index % 2 ? 'Colaborador de ejemplo' : 'Administrador de ejemplo' },
  module: index === 0 ? 'modulo_nuevo' : Object.keys(historyModules)[index % 7],
  action: index === 0 ? 'ACCION_NUEVA' : Object.keys(historyActions)[index % 8],
  record_id: index + 1, record_name: `Publicación de ejemplo ${index + 1}`,
  description: `Evento ficticio ${index + 1}. Esta descripción completa permite revisar el diálogo del historial sin consultar ni modificar datos del servidor.`,
  date: `2026-10-${String(24 - index).padStart(2, '0')}T12:00:00-06:00`,
}));
export function previewHistoryPage(filters, page) {
  const selected = previewHistory.filter((item) => {
    const date = item.date.slice(0, 10);
    return (!filters.q || `${item.record_name} ${item.description}`.toLocaleLowerCase('es').includes(filters.q.trim().toLocaleLowerCase('es'))) &&
      (!filters.module || item.module === filters.module) && (!filters.action || item.action === filters.action) &&
      (!filters.user_id || String(item.user.id) === filters.user_id) && (!filters.date_from || date >= filters.date_from) && (!filters.date_to || date <= filters.date_to);
  });
  return { count: selected.length, page, page_size: 12, results: selected.slice((page - 1) * 12, page * 12) };
}
