import { apiRequest } from '../../../services/apiClient.js';
import {
  hasTextFields,
  isTextArray,
  validateResource,
} from '../../../components/ui/resourceValidation.js';

const isService = (value) =>
  hasTextFields(value, ['id', 'title', 'image', 'short', 'description', 'subject']) &&
  ['id', 'title', 'short', 'description', 'subject'].every((field) => value[field].trim()) &&
  isTextArray(value.items);
export const servicesService = {
  async list(options) {
    return validateResource(
      await apiRequest('services/', options),
      (value) => Array.isArray(value) && value.every(isService),
    );
  },
  async get(serviceId, options) {
    return validateResource(
      await apiRequest(`services/${encodeURIComponent(serviceId)}/`, options),
      isService,
    );
  },
};
