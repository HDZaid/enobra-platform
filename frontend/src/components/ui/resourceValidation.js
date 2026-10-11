export const isText = (value) => typeof value === 'string';
export const isTextArray = (value) => Array.isArray(value) && value.every(isText);
export const hasTextFields = (value, fields) =>
  value && fields.every((field) => isText(value[field]));

export function validateResource(value, isValid) {
  if (!isValid(value)) throw new Error('La respuesta no corresponde al contrato de contenido.');
  return value;
}

export function mediaUrl(value) {
  if (typeof value !== 'string') return '/assets/enobra/estructura.jpg';
  if (value.startsWith('assets/')) return `/assets/enobra/${value.slice(7)}`;
  if (/^(https?:\/\/|\/(?!\/))/.test(value)) return value;
  return '/assets/enobra/estructura.jpg';
}

export function externalUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : undefined;
}
