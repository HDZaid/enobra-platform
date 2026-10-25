// describeApiError(error, { action: 'guardar' }); fieldErrors(error).title
export function describeApiError(error, { action = 'completar la operación' } = {}) {
  switch (Number(error?.status)) {
    case 400: return 'Revisa los datos ingresados e inténtalo de nuevo.';
    case 401: return 'Tu sesión venció. Inicia sesión nuevamente.';
    case 403: return 'Sin permiso para realizar esta acción.';
    case 404: return 'No encontramos el contenido solicitado.';
    case 413: return 'El archivo es demasiado grande.';
    case 429: return 'Demasiados intentos. Espera un momento antes de reintentar.';
    case 501: return 'Módulo aún no disponible. Inténtalo más tarde.';
    default:
      if (error?.name === 'AbortError') return 'La operación se canceló.';
      if (error?.status === 0 || error instanceof TypeError || error?.code === 'network_error') {
        return 'Revisa tu conexión e inténtalo nuevamente.';
      }
      return `No se pudo ${action}. Inténtalo de nuevo.`;
  }
}

function messages(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(messages).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(messages).filter(Boolean).join(' ');
  return '';
}

export function fieldErrors(error) {
  if (Number(error?.status) !== 400 || !error.details || typeof error.details !== 'object' || Array.isArray(error.details)) return {};
  return Object.fromEntries(Object.entries(error.details)
    .map(([field, value]) => [field, messages(value)])
    .filter(([, message]) => message));
}
