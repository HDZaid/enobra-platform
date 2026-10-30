const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

import { resolveAdminToken, reportUnauthorized } from './adminTransport.js';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { Accept: 'application/json' };

  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  const access = resolveAdminToken(token);
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    signal,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = response.status === 204
    ? null
    : contentType.includes('application/json')
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    if (response.status === 401) reportUnauthorized(access);
    const error = payload && typeof payload === 'object' ? payload.error : null;
    throw new ApiError(
      error?.message || `Error HTTP ${response.status}`,
      response.status,
      error?.code || 'http_error',
      error?.details || null,
    );
  }

  return payload;
}
