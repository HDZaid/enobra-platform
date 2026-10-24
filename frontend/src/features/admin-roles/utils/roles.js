const moduleLabels = [
  ['properties', 'Bienes Raíces'], ['projects', 'Proyectos'], ['news', 'Noticias'],
  ['inquiries', 'Mensajes'], ['media', 'Medios'], ['company', 'Empresa'],
  ['users', 'Usuarios'], ['roles', 'Roles'], ['audit', 'Historial'], ['admin', 'Acceso total'],
];

export function readRole(value) {
  if (!value || !Number.isInteger(value.id) || value.id < 1 || typeof value.name !== 'string' ||
      (value.description != null && typeof value.description !== 'string') ||
      typeof value.active !== 'boolean' || !Array.isArray(value.permissions) ||
      value.permissions.some((name) => typeof name !== 'string')) {
    throw new TypeError('El servidor devolvió un rol con formato inválido.');
  }
  return { ...value, description: value.description ?? '', permissions: [...value.permissions] };
}

export function readRoles(value) {
  if (!Array.isArray(value)) throw new TypeError('No se pudo leer la lista de roles.');
  return value.map(readRole);
}

export function readPermissions(value) {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item.name !== 'string' ||
      !item.name || (item.description != null && typeof item.description !== 'string')) ||
      new Set(value.map((item) => item.name)).size !== value.length) {
    throw new TypeError('No se pudo leer el catálogo de permisos.');
  }
  return value.map((item) => ({ name: item.name, description: item.description ?? '' }));
}

export function groupPermissions(permissions) {
  const groups = new Map(moduleLabels.map(([key, label]) => [key, { key, label, items: [] }]));
  for (const permission of permissions) {
    const key = permission.name.split('.')[0];
    if (!groups.has(key)) groups.set(key, { key, label: key, items: [] });
    groups.get(key).items.push(permission);
  }
  return [...groups.values()].filter((group) => group.items.length);
}

export function roleDraft(role) {
  return role ? { name: role.name, description: role.description ?? '', active: role.active,
    permissions: [...role.permissions] } : { name: '', description: '', active: true, permissions: [] };
}

export function setPermissionGroup(selected, group, checked) {
  const names = new Set(group.items.map((item) => item.name));
  return checked ? [...new Set([...selected, ...names])] : selected.filter((name) => !names.has(name));
}

export function makeRolePayload(draft, original) {
  // El backend conserva las reglas del rol protegido; la UI solo permite su descripción.
  if (original?.name === 'Ingeniero') return { description: draft.description.trim() };
  return { name: draft.name.trim(), description: draft.description.trim(), active: draft.active,
    permissions: [...new Set(draft.permissions)] };
}

export function roleHasChanges(draft, baseline, original) {
  const normalize = (value) => {
    const payload = makeRolePayload(value, original);
    if (payload.permissions) payload.permissions.sort();
    return JSON.stringify(payload);
  };
  return normalize(draft) !== normalize(baseline);
}

export function isOwnRole(user, role) {
  return Boolean(role && (user?.role === role.name || user?.roles?.includes(role.name)));
}

export function roleFieldErrors(error) {
  if (error?.status !== 400 || !error.details || typeof error.details !== 'object') return {};
  return Object.fromEntries(['name', 'description', 'active', 'permissions'].filter((key) => error.details[key])
    .map((key) => [key, Array.isArray(error.details[key]) ? error.details[key].join(' ') : String(error.details[key])]));
}

export function roleRequestError(error) {
  if (error?.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error?.status === 403) return error.message || 'Tu cuenta no tiene permiso para consultar o administrar roles.';
  if (error?.status === 404) return 'No se encontró el rol solicitado.';
  if (error?.status === 501) return 'La gestión de roles aún no está implementada en este servidor.';
  return error?.message || 'No se pudo contactar con el servidor. Inténtalo de nuevo.';
}
