import { ApiError } from './apiClient.js';
import { validateImageFile, validUploadedImageUrl } from '../components/ui/imageUpload.js';

const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

// uploadMedia(file, { kind: 'photo', token, onProgress: percent => {}, signal })
export function uploadMedia(file, { kind = 'photo', token, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Cancelado', 'AbortError')); return; }
    const invalid = validateImageFile(file);
    if (invalid) { reject(new ApiError(invalid, 400, 'invalid_image', { file: [invalid] })); return; }
    if (!['photo', 'render', 'news', 'logo'].includes(kind)) { reject(new ApiError('Tipo de medio inválido.', 400, 'invalid_kind')); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    function finish(callback, value) {
      signal?.removeEventListener('abort', abort);
      xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = null;
      xhr.upload.onprogress = null;
      callback(value);
    }
    xhr.onload = () => {
      let payload;
      try { payload = JSON.parse(xhr.responseText); } catch { payload = null; }
      if (xhr.status !== 201) {
        const error = payload?.error;
        finish(reject, new ApiError(error?.message || `Error HTTP ${xhr.status}`, xhr.status, error?.code || 'http_error', error?.details));
        return;
      }
      if (!payload?.id || !validUploadedImageUrl(payload?.url)) {
        finish(reject, new ApiError('El servidor no devolvió una imagen válida.', 502, 'invalid_response'));
        return;
      }
      finish(resolve, payload);
    };
    xhr.onerror = () => finish(reject, new ApiError('Error de conexión.', 0, 'network_error'));
    xhr.ontimeout = () => finish(reject, new ApiError('La subida tardó demasiado.', 0, 'network_error'));
    xhr.onabort = () => finish(reject, new DOMException('Cancelado', 'AbortError'));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    try {
      xhr.open('POST', `${baseUrl}/admin/media/`);
      xhr.timeout = 120000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      signal?.addEventListener('abort', abort, { once: true });
      xhr.send(body);
    } catch (error) { finish(reject, error); }
  });
}
