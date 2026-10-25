import { hasAdminPermission } from '../../admin/utils/adminData.js';

export const trashTypes = [{ value: 'properties', label: 'Bienes Raíces' }, { value: 'projects', label: 'Proyectos' }];
export function validTrashType(type) { return trashTypes.some((item) => item.value === type); }
export function canViewTrash(user, type) {
  return validTrashType(type) && ['trash.any', 'trash.own', 'restore', 'delete_permanently'].some((suffix) => hasAdminPermission(user, `${type}.${suffix}`));
}
export function trashActions(user, type) {
  return {
    restore: validTrashType(type) && hasAdminPermission(user, `${type}.restore`),
    remove: validTrashType(type) && hasAdminPermission(user, `${type}.delete_permanently`),
  };
}
export function ownsTrashOnly(user, type) {
  return canViewTrash(user, type) && !['trash.any', 'restore', 'delete_permanently'].some((suffix) => hasAdminPermission(user, `${type}.${suffix}`));
}
export function trashIdentifier(type, id) {
  const value = String(id ?? '');
  if (!validTrashType(type) || !(type === 'properties' ? /^[1-9]\d*$/.test(value) : /^[-a-zA-Z0-9_]+$/.test(value))) {
    throw new Error('Identificador de papelera inválido.');
  }
  return value;
}
export function readTrashPage(data, type) {
  if (!validTrashType(type) || !data || !Number.isInteger(data.count) || data.count < 0 ||
    !Number.isInteger(data.page) || data.page < 1 || !Number.isInteger(data.page_size) || data.page_size < 1 ||
    !Array.isArray(data.results) || data.results.length > data.page_size || data.results.length > data.count) {
    throw new Error('El servidor no devolvió una página de papelera válida.');
  }
  const results = data.results.map((item) => {
    if (!item || item.type !== type || typeof item.title !== 'string' || !item.title.trim() ||
      typeof item.was_published !== 'boolean' || typeof item.trashed_at !== 'string' || !Number.isFinite(Date.parse(item.trashed_at)) ||
      !['trashed_by', 'trashed_by_name', 'owner_id'].every((key) => item[key] === null || typeof item[key] === 'string')) {
      throw new Error('El servidor devolvió un elemento de papelera inválido.');
    }
    return { type, id: trashIdentifier(type, item.id), title: item.title, trashed_at: item.trashed_at,
      trashed_by: item.trashed_by, trashed_by_name: item.trashed_by_name, was_published: item.was_published, owner_id: item.owner_id };
  });
  return { count: data.count, page: data.page, page_size: data.page_size, results };
}
export function formatTrashDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Fecha no disponible';
}
