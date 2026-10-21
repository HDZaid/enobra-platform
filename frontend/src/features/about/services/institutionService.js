import { apiRequest } from '../../../services/apiClient.js';
import {
  hasTextFields,
  isTextArray,
  validateResource,
} from '../../../components/ui/resourceValidation.js';

export const institutionService = {
  async get(options) {
    return validateResource(
      await apiRequest('institution/', options),
      (value) =>
        hasTextFields(value, ['signature', 'role', 'vision', 'mission']) &&
        isTextArray(value.presentation) &&
        Array.isArray(value.principles) &&
        value.principles.every((item) => hasTextFields(item, ['title', 'description'])),
    );
  },
};
