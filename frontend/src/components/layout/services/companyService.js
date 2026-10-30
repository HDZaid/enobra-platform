import { reference } from '../data/reference.js';
import { apiRequest } from '../../../services/apiClient.js';
import { hasTextFields, isTextArray, validateResource, textOrReference, textListOrReference } from '../../ui/resourceValidation.js';

export const companyService = {
  async get(options) {
    const data = validateResource(
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
    return {
      ...data,
      name: textOrReference(data.name, reference.name),
      person: textOrReference(data.person, reference.person),
      address: textOrReference(data.address, reference.address),
      phones: textListOrReference(data.phones, reference.phones),
      whatsapp: textOrReference(data.whatsapp, reference.whatsapp),
    };
  },
};
