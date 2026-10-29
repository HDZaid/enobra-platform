import { hasAdminPermission } from '../../admin/utils/adminData.js';
import { validUploadedImageUrl } from '../../../components/ui/imageUpload.js';
import { parseYoutube } from '../../projects/services/catalogMapper.js';

// P-01/P-02 integrados: DELETE envía a papelera; limpieza tras más de 90 días.
// Usar junto con el backend integrado, nunca con el DELETE definitivo anterior.
export const PROJECT_TRASH_ENABLED = true;
export const canCreateProject = (user) => hasAdminPermission(user, 'projects.create');
export const canPublishProject = (user) => hasAdminPermission(user, 'projects.publish');
export function canEditProject(user, item) {
  return hasAdminPermission(user, 'projects.edit.any') ||
    (item?.published === false && hasAdminPermission(user, 'projects.edit.own'));
}
export const canTrashProject = (user, item) => hasAdminPermission(user, 'projects.trash.any') ||
  (item?.published === false && hasAdminPermission(user, 'projects.trash.own'));
export const canToggleProject = (user, item) => canPublishProject(user) && canEditProject(user, item);
export function projectDraft(item) {
  return {
    title: item?.title ?? '', category: item?.category ?? '', country: item?.country ?? 'Guatemala',
    year: String(item?.year || new Date().getFullYear()), description: item?.description ?? '',
    images: [...(item?.images ?? [])], renders: [...(item?.renders ?? [])], video: item?.video ?? '',
    published: item?.published ?? false,
  };
}
export function validateProject(draft, currentYear = new Date().getFullYear()) {
  const errors = {};
  for (const [key, label, max] of [['title', 'El título', 160], ['category', 'La categoría', 80], ['country', 'El país', 80]]) {
    if (!draft[key]?.trim() || draft[key].trim().length > max) errors[key] = `${label} debe tener entre 1 y ${max} caracteres.`;
  }
  if (!/^\d{4}$/.test(String(draft.year)) || Number(draft.year) < 1900 || Number(draft.year) > currentYear + 5) errors.year = `Ingresa un año entre 1900 y ${currentYear + 5}.`;
  if (!draft.description?.trim()) errors.description = 'Escribe una descripción.';
  for (const [key, min] of [['images', 1], ['renders', 0]]) {
    if (!Array.isArray(draft[key]) || draft[key].length < min || draft[key].length > 40 || !draft[key].every(validUploadedImageUrl)) errors[key] = `Se requieren entre ${min} y 40 imágenes válidas.`;
  }
  if (draft.video && !parseYoutube(draft.video)) errors.video = 'Usa un enlace HTTPS válido de YouTube o deja el campo vacío.';
  if (typeof draft.published !== 'boolean') errors.published = 'Selecciona un estado válido.';
  return errors;
}
export function makeProjectPayload(draft, { canPublish = false } = {}) {
  const errors = validateProject(draft);
  if (Object.keys(errors).length) throw new TypeError('Revisa los campos del proyecto.');
  return { title: draft.title.trim(), category: draft.category.trim(), country: draft.country.trim(),
    year: Number(draft.year), description: draft.description.trim(), images: [...draft.images],
    renders: [...draft.renders], video: draft.video, demo: false, published: canPublish ? draft.published : false };
}
export function filterProjects(items, query) {
  const term = query.trim().toLocaleLowerCase('es');
  return items.filter((item) => `${item.title} ${item.category} ${item.country}`.toLocaleLowerCase('es').includes(term));
}
export const projectEditPath = (slug) => `/admin/proyectos/${encodeURIComponent(slug)}/editar`;
