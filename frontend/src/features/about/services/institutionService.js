import { reference } from '../data/reference.js';
import { apiRequest } from '../../../services/apiClient.js';
import {
  hasTextFields,
  isTextArray,
  validateResource, textOrReference, textListOrReference,
} from '../../../components/ui/resourceValidation.js';

export const institutionService = {
  async get(options) {
    const data = validateResource(
      await apiRequest('institution/', options),
      (value) =>
        hasTextFields(value, ['signature', 'role', 'vision', 'mission']) &&
        isTextArray(value.presentation) &&
        Array.isArray(value.principles) &&
        value.principles.every((item) => hasTextFields(item, ['title', 'description'])),
    );
    const principles = data.principles.filter((item) => item.title.trim() && item.description.trim());
    return {
      ...data,
      presentation: textListOrReference(data.presentation, reference.presentation),
      signature: textOrReference(data.signature, reference.signature),
      role: textOrReference(data.role, reference.role),
      mission: textOrReference(data.mission, reference.mission),
      vision: textOrReference(data.vision, reference.vision),
      principles: principles.length ? principles : reference.principles.map((item) => ({ ...item })),
    };
  },
};
