export const emptyUserDraft = () => ({ name: '', email: '', password: '', confirmation: '', role_id: '', active: true });

export function validateUserDraft(draft, roles) {
  const errors = {};
  if (!draft.name.trim() || draft.name.trim().length > 120) errors.name = 'Escribe un nombre de hasta 120 caracteres.';
  if (draft.email.trim().length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Escribe un correo válido de hasta 150 caracteres.';
  if (draft.password.length < 10 || draft.password.length > 128 || /^\d+$/.test(draft.password)) {
    errors.password = 'Usa entre 10 y 128 caracteres y evita una contraseña solo de números.';
  }
  if (draft.password !== draft.confirmation) errors.confirmation = 'Las contraseñas no coinciden.';
  if (!roles.some((role) => role.active && String(role.id) === String(draft.role_id))) errors.role_id = 'Selecciona un rol activo.';
  return errors;
}

export function makeUserPayload(draft) {
  return { name: draft.name.trim(), email: draft.email.trim().toLowerCase(), password: draft.password,
    role_id: Number(draft.role_id), active: draft.active };
}

export function userEditDraft(user) {
  return { name: user.name, active: user.active,
    role_id: user.roles.length === 1 ? String(user.roles[0].id) : '' };
}

export function userEditChanges(draft, user) {
  const data = {};
  if (draft.name.trim() !== user.name) data.name = draft.name.trim();
  if (draft.active !== user.active) data.active = draft.active;
  const roleChanged = draft.role_id !== '' && (user.roles.length !== 1 ||
    String(user.roles[0].id) !== String(draft.role_id));
  return { data, ...(roleChanged ? { role_id: Number(draft.role_id) } : {}) };
}

export function canAssignUserRole(role, actor) {
  const permissions = actor?.permissions || [];
  return role.active && (permissions.includes('admin.all') ||
    role.permissions.every((permission) => permissions.includes(permission)));
}

export function validateUserEditDraft(draft, user, roles, actor) {
  const errors = {};
  if (!draft.name.trim() || draft.name.trim().length > 120) errors.name = 'Escribe un nombre de hasta 120 caracteres.';
  const changes = userEditChanges(draft, user);
  const own = String(user.id) === String(actor?.id);
  if (own && changes.data.active === false) errors.active = 'No puedes desactivarte a ti mismo.';
  if (changes.role_id !== undefined) {
    const role = roles.find((item) => item.id === changes.role_id);
    if (own) errors.role_id = 'No puedes cambiar tu propio rol.';
    else if (!role?.active) errors.role_id = 'Selecciona un rol activo.';
    else if (!canAssignUserRole(role, actor)) errors.role_id = 'No puedes asignar un rol con permisos que no posees.';
  }
  return errors;
}

export function readUserRoles(payload) {
  if (!Array.isArray(payload) || payload.some((role) => !Number.isInteger(role.id) ||
      typeof role.name !== 'string' || typeof role.active !== 'boolean' || !Array.isArray(role.permissions))) {
    throw new TypeError('No se pudieron leer los roles del servidor.');
  }
  return payload.filter((role) => role.active);
}

export function readManagedUser(item) {
  if (!item || item.id == null || typeof item.name !== 'string' || typeof item.email !== 'string' ||
      typeof item.active !== 'boolean' || !Array.isArray(item.roles) ||
      item.roles.some((role) => !Number.isInteger(role.id) || typeof role.name !== 'string') ||
      typeof item.created_at !== 'string' || !Number.isFinite(Date.parse(item.created_at))) {
    throw new TypeError('El servidor devolvió un usuario con formato inválido.');
  }
  return { id: String(item.id), name: item.name, email: item.email, active: item.active,
    roles: item.roles.map((role) => ({ id: role.id, name: role.name })), created_at: item.created_at };
}

export function userRequestError(error) {
  if (error?.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión para continuar.';
  if (error?.status === 403) return error.message || 'Tu cuenta no tiene autorización para administrar usuarios.';
  if (error?.status === 404 && error.message) return error.message;
  if (error?.status === 404 || error?.status === 501) return 'La gestión de usuarios todavía no está disponible en este servidor.';
  return error?.message || 'No se pudo contactar con el servidor. Inténtalo de nuevo.';
}

export function userFieldErrors(error) {
  const details = error?.status === 400 ? error.details : null;
  if (!details || typeof details !== 'object') return {};
  return Object.fromEntries(['name', 'email', 'password', 'role_id', 'active'].filter((key) => details[key])
    .map((key) => [key, Array.isArray(details[key]) ? details[key].join(' ') : String(details[key])]));
}

export const previewUserRoles = Object.freeze([
  { id: 1, name: 'Ingeniero', description: 'Acceso administrativo completo.', active: true, permissions: ['admin.all'] },
  { id: 2, name: 'Arquitecta', description: 'Publicaciones de bienes raíces.', active: true, permissions: ['properties.publish'] },
  { id: 3, name: 'Empleado', description: 'Preparación de borradores propios.', active: true, permissions: ['properties.create'] },
]);

export const previewUsers = Object.freeze([
  { id: 'demo-engineer', name: 'Administrador de ejemplo', email: 'ingeniero@example.test', active: true,
    roles: [{ id: 1, name: 'Ingeniero' }], created_at: '2026-10-21T12:00:00Z' },
  { id: 'demo-employee', name: 'Colaborador de ejemplo', email: 'colaborador@example.test', active: false,
    roles: [{ id: 3, name: 'Empleado' }], created_at: '2026-10-20T12:00:00Z' },
]);
