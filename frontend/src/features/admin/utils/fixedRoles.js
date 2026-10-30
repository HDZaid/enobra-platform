// Etiquetas de la política fija. Los IDs siempre proceden del servidor.
export const fixedRoleDescriptions = Object.freeze({
  Administrador: 'Acceso completo. Crea usuarios y elimina definitivamente. No personaliza roles.',
  Empleado: 'Crea, edita y publica noticias, proyectos y propiedades de cualquier usuario. Carga imágenes. Sin papelera ni administración.',
  Arquitecto: 'Gestiona contenido, envía a papelera y restaura. No crea usuarios, cambia roles ni elimina definitivamente.',
});
export function fixedRoleLabel(name) {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return { ingeniero: 'Administrador', admin: 'Administrador', administrador: 'Administrador', arquitecta: 'Arquitecto', arquitecto: 'Arquitecto', empleado: 'Empleado' }[key] || null;
}
export function canEditManagedUser(actor, user) {
  const permissions = actor?.permissions || [];
  if (permissions.includes('admin.all')) return true;
  return permissions.includes('users.manage') && !user.roles.some((role) => fixedRoleLabel(role.name) === 'Administrador');
}
