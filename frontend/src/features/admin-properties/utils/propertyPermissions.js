// Reglas de permisos de Bienes Raíces en el panel (espejo de apps/properties/views.py).
// Ocultar o deshabilitar un botón es solo comodidad: el backend siempre decide (403).
import { hasAdminPermission } from '../../admin/utils/adminData.js';

const can = (user, permission) => hasAdminPermission(user, permission);

// Un "borrador propio" es un borrador que el backend le muestra a quien solo tiene `edit.own`.
// La lista de un Empleado ya llega filtrada por el servidor a sus propios borradores.
const isDraft = (item) => item?.published === false;

export const canCreateProperty = (user) => can(user, 'properties.create');

export function canEditProperty(user, item) {
  if (can(user, 'properties.edit.any')) return true;
  return can(user, 'properties.edit.own') && isDraft(item);
}

// Publicar exige `publish`; despublicar una publicada exige además `edit.any`
// (con `edit.own` solo se puede tocar un borrador).
export function canTogglePublished(user, item) {
  return can(user, 'properties.publish') && canEditProperty(user, item);
}

export function canTrashProperty(user, item) {
  if (can(user, 'properties.trash.any')) return true;
  return can(user, 'properties.trash.own') && isDraft(item);
}

// Motivo para mostrar en el tooltip cuando una acción existe pero está bloqueada.
export function trashBlockedReason(user, item) {
  if (canTrashProperty(user, item)) return '';
  if (can(user, 'properties.trash.own') && !isDraft(item)) {
    return 'Con tu rol solo puedes enviar borradores a la papelera.';
  }
  return 'Tu rol no puede enviar publicaciones a la papelera.';
}
