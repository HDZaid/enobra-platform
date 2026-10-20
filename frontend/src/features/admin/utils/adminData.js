// Comprobaciones del contrato HTTP de Django, sin guardar credenciales en el navegador.
export function readAdminSession(response) {
  if (!response || typeof response.access !== 'string' || !response.access ||
      typeof response.refresh !== 'string' || !response.refresh ||
      response.user?.role !== 'admin') {
    throw new TypeError('La respuesta de autenticación no corresponde a una sesión administrativa válida.');
  }
  return {
    access: response.access,
    refresh: response.refresh,
    user: {
      id: String(response.user.id ?? ''),
      name: String(response.user.name ?? 'Administración'),
      email: String(response.user.email ?? ''),
      role: 'admin',
    },
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
