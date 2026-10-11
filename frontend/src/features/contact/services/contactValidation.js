export const CONTACT_SUBJECTS = Object.freeze([
  'Diseño',
  'Administración de proyectos',
  'Preconstrucción',
  'Construcción',
  'Bienes raíces',
  'Otro',
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getContactSubject(search = '') {
  const query = new URLSearchParams(search);
  const requested = query.get('asunto');
  return CONTACT_SUBJECTS.includes(requested) ? requested : 'Diseño';
}

export function buildContactPayload(form) {
  return {
    name: String(form.name ?? '').trim(),
    email: String(form.email ?? '').trim(),
    phone: String(form.phone ?? '').replace(/[\s-]/g, ''),
    subject: String(form.subject ?? '').trim(),
    message: String(form.message ?? '').trim(),
    website: String(form.website ?? '').trim(),
  };
}

export function validateContact(form) {
  const data = buildContactPayload(form);
  const errors = {};

  if (!data.name) errors.name = 'Ingresa tu nombre.';
  else if (data.name.length > 120) errors.name = 'Usa un máximo de 120 caracteres.';

  if (!data.email) errors.email = 'Ingresa tu correo electrónico.';
  else if (!emailPattern.test(data.email)) errors.email = 'Ingresa un correo válido.';

  if (!data.phone) errors.phone = 'Ingresa tu número de teléfono.';
  else if (!/^\d{8}$/.test(data.phone)) errors.phone = 'Ingresa un número de Guatemala de 8 dígitos.';

  if (!CONTACT_SUBJECTS.includes(data.subject)) errors.subject = 'Selecciona un tipo de consulta.';

  if (!data.message) errors.message = 'Escribe tu mensaje.';
  else if (data.message.length > 2000) errors.message = 'El mensaje no puede superar 2000 caracteres.';

  if (data.website) errors.website = 'La solicitud no puede procesarse.';
  return errors;
}
