import { apiRequest } from '../../../services/apiClient.js';
import { validNewsImageReference } from '../utils/newsEditor.js';

// Django decide el proveedor de almacenamiento y devuelve la URL pública.
export const adminMediaService = {
  async uploadNewsImage(file, token) {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', 'news');
    const response = await apiRequest('admin/media/', { method: 'POST', body: form, token });
    if (!validNewsImageReference(response?.url)) {
      throw new TypeError('Django no devolvió una referencia de imagen válida.');
    }
    return response.url;
  },
};
