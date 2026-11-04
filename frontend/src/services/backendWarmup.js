const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
let request;

// Una sola petición por carga de la aplicación, incluso al remontar Inicio.
export function warmBackend() {
  if (!request) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);
    request = Promise.resolve()
      .then(() => fetch(`${baseUrl}/health/`, {
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      }))
      .then((response) => response.text())
      .catch(() => undefined)
      .finally(() => clearTimeout(timeout));
  }
  return request;
}
