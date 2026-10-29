import { matchPath } from 'react-router-dom';
import { routePaths } from '../../../app/routePaths.js';

// Comprobaciones del contrato HTTP de Django, sin guardar credenciales en el navegador.
// Django autoriza por permisos efectivos (RBAC). El nombre del rol solo se usa para mostrarlo;
// las secciones del panel se habilitan con `user.permissions`, igual que en el backend.

export const FULL_ACCESS_PERMISSION = 'admin.all';

// Roles iniciales definidos en backend/apps/accounts/access_policy.py.
// `admin`/`Administrador` son cuentas del esquema anterior que Django sigue aceptando.
export const adminRoleProfiles = Object.freeze({
  ingeniero: Object.freeze({ label: 'Ingeniero', description: 'Administrador principal' }),
  arquitecta: Object.freeze({ label: 'Arquitecta', description: 'Publicaciones de bienes raíces' }),
  empleado: Object.freeze({ label: 'Empleado', description: 'Borradores de bienes raíces' }),
  admin: Object.freeze({ label: 'Administrador', description: 'Acceso completo' }),
  administrador: Object.freeze({ label: 'Administrador', description: 'Acceso completo' }),
});

const PROPERTY_PERMISSIONS = Object.freeze([
  'properties.create', 'properties.edit.any', 'properties.edit.own', 'properties.publish',
  'properties.trash.any', 'properties.trash.own', 'properties.restore', 'properties.delete_permanently',
]);

const PROJECT_PERMISSIONS = PROPERTY_PERMISSIONS.map((permission) => permission.replace('properties.', 'projects.'));

export const adminSectionPermissions = Object.freeze({
  dashboard: Object.freeze([]),
  properties: PROPERTY_PERMISSIONS,
  projects: Object.freeze(PROJECT_PERMISSIONS),
  trash: Object.freeze([...PROPERTY_PERMISSIONS, ...PROJECT_PERMISSIONS].filter((permission) =>
    /\.(trash\.(any|own)|restore|delete_permanently)$/.test(permission))),
  history: Object.freeze(['audit.read']),
  roles: Object.freeze(['roles.manage', 'roles.read']),
  users: Object.freeze(['users.manage', 'users.read']),
  news: Object.freeze(['news.create', 'news.edit', 'news.publish', 'news.delete']),
  inbox: Object.freeze(['inquiries.read', 'inquiries.manage']),
});

export function sectionForPath(pathname) {
  const sections = [
    ['dashboard', routePaths.admin], ['properties', routePaths.adminProperties],
    ['projects', routePaths.adminProjects], ['trash', routePaths.adminTrash],
    ['history', routePaths.adminHistory], ['roles', routePaths.adminRoles],
    ['users', routePaths.adminUsers], ['news', routePaths.adminNews], ['inbox', routePaths.adminInbox],
  ];
  if (matchPath({ path: routePaths.admin, end: true }, pathname)) return 'dashboard';
  return sections.slice(1).find(([, path]) => matchPath({ path: `${path}/*`, end: true }, pathname))?.[0] ?? null;
}

// Las rutas de formularios también requieren el permiso de la acción.
export function canAccessAdminPath(user, pathname) {
  const section = sectionForPath(pathname);
  if (!section || !canAccessAdminSection(user, section)) return false;
  const actions = [
    [routePaths.adminPropertyNew, ['properties.create']],
    [routePaths.adminPropertyEdit, ['properties.edit.any', 'properties.edit.own']],
    [routePaths.adminProjectNew, ['projects.create']],
    [routePaths.adminProjectEdit, ['projects.edit.any', 'projects.edit.own']],
    [routePaths.adminRoleNew, ['roles.manage']],
  ];
  const action = actions.find(([path]) => matchPath({ path, end: true }, pathname));
  return !action || action[1].some((permission) => hasAdminPermission(user, permission));
}

export function refreshedAdminSession(session, user) {
  const next = readAdminSession({ ...session, user });
  if (next.user.id !== session.user.id) throw new TypeError('La cuenta de la sesión ha cambiado.');
  return next;
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const fold = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es');

function invalidSession(message, code) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

export function readAdminSession(response) {
  const user = response?.user;
  const validShape = response && isText(response.access) && isText(response.refresh) &&
    user && typeof user === 'object' && user.id != null && isText(user.role) &&
    Array.isArray(user.permissions) && user.permissions.every((value) => typeof value === 'string') &&
    (user.roles === undefined || (Array.isArray(user.roles) && user.roles.every(isText)));
  if (!validShape) {
    throw invalidSession('La respuesta de autenticación no corresponde a una sesión administrativa válida.', 'invalid_session');
  }
  const permissions = [...new Set(user.permissions.filter(isText))];
  if (!permissions.length) {
    throw invalidSession('Tu cuenta no tiene permisos asignados para el panel. Pide a un Ingeniero que revise tu rol.', 'no_panel_permissions');
  }
  return {
    access: response.access,
    refresh: response.refresh,
    user: {
      id: String(user.id),
      name: isText(user.name) ? user.name : 'Administración',
      email: String(user.email ?? ''),
      role: user.role,
      roles: user.roles?.length ? [...user.roles] : [user.role],
      permissions,
    },
  };
}

export function hasAdminPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes(FULL_ACCESS_PERMISSION) || permissions.includes(permission);
}

export function canAccessAdminSection(user, section) {
  const required = adminSectionPermissions[section];
  if (!required) return false;
  return required.length === 0 || required.some((permission) => hasAdminPermission(user, permission));
}

export function adminRoleProfile(user) {
  const known = adminRoleProfiles[fold(user?.role)];
  if (known) return known;
  return {
    label: isText(user?.role) ? user.role.trim() : 'Sin rol',
    description: hasAdminPermission(user, FULL_ACCESS_PERMISSION) ? 'Acceso completo' : 'Permisos personalizados',
  };
}

export function readAdminCollection(payload) {
  if (!payload || !Array.isArray(payload.results) || !Number.isInteger(payload.count) || payload.count < 0) {
    throw new TypeError('El servidor no devolvió una lista paginada válida.');
  }
  return { items: payload.results, count: payload.count };
}

export function displayAdminCount(value) {
  return Number.isInteger(value) && value >= 0 ? String(value) : '—';
}

export const inquiryStatuses = Object.freeze({
  nuevo: 'Nuevo',
  atendido: 'Atendido',
  archivado: 'Archivado',
});

export function validInquiryStatus(value) {
  return Object.hasOwn(inquiryStatuses, value);
}

// Reglas de interfaz; Django sigue autorizando cada operación.
export function adminActions(user, preview = false) {
  const can = (permission) => preview || hasAdminPermission(user, permission);
  return {
    createNews: can('news.create'), editNews: can('news.edit'),
    publishNews: can('news.publish'), deleteNews: can('news.delete'),
    manageInquiries: can('inquiries.manage'),
  };
}

export function newsPayloadForPermissions(payload, { existing = false, canPublish = false } = {}) {
  if (canPublish) return { ...payload };
  const result = { ...payload };
  // PATCH conserva el estado actual; POST nunca hereda published=true del serializer.
  if (existing) delete result.published;
  else result.published = false;
  return result;
}
