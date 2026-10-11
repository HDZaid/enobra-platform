import { apiRequest } from '../../../services/apiClient.js';
import { hasTextFields, isTextArray, validateResource } from '../../ui/resourceValidation.js';

export const companyService = {
  async get(options) {
    return validateResource(
      await apiRequest('company/', options),
      (value) =>
        hasTextFields(value, [
          'name',
          'person',
          'address',
          'whatsapp',
          'email',
          'instagram',
          'facebook',
          'domain',
          'logo',
        ]) && isTextArray(value.phones),
    );
  },
};
