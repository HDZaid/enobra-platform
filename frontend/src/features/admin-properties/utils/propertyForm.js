import { validUploadedImageUrl } from '../../../components/ui/imageUpload.js';
import { parseYoutube } from '../../projects/services/catalogMapper.js';

// Límites iguales a los de PropertyWriteSerializer (backend). Si el backend cambia, cambian aquí.
export const PROPERTY_LIMITS = {
  title: 160, zone: 60, location: 120, price: 9_999_999_999, counter: 999, areaMin: 1, areaMax: 99_999_999, images: 40,
};
export const OPERATIONS = ['Venta', 'Alquiler'];
export const PROPERTY_TYPES = ['Casa', 'Apartamento', 'Terreno', 'Local'];
export const hasNoRooms = (type) => type === 'Terreno';

const toDateInput = (value) => (/^\d{4}-\d{2}-\d{2}/.test(value ?? '') ? value.slice(0, 10) : '');
export const todayIso = (now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// Valores del formulario: todo texto, salvo listas y el estado de publicación.
export function propertyDraft(item, now = new Date()) {
  return {
    title: item?.title ?? '', operation: item?.operation ?? 'Venta', type: item?.type ?? 'Casa',
    zone: item?.zone ?? '', location: item?.location ?? '',
    price: item ? String(item.price) : '', rooms: String(item?.rooms ?? 0), baths: String(item?.baths ?? 0),
    parking: String(item?.parking ?? 0), area: item ? String(item.area) : '',
    date: toDateInput(item?.date) || todayIso(now), description: item?.description ?? '',
    commercial: item?.commercial ?? '', images: [...(item?.images ?? [])], renders: [...(item?.renders ?? [])],
    video: item?.video ?? '', published: item?.published ?? false,
  };
}

const isWhole = (value) => /^\d+$/.test(String(value).trim());

export function validatePropertyDraft(draft) {
  const errors = {};
  const text = (key, label, max) => {
    const value = draft[key]?.trim() ?? '';
    if (!value || value.length > max) errors[key] = `${label} debe tener entre 1 y ${max} caracteres.`;
  };
  text('title', 'El título', PROPERTY_LIMITS.title);
  text('zone', 'La zona', PROPERTY_LIMITS.zone);
  text('location', 'La ubicación', PROPERTY_LIMITS.location);
  if (!OPERATIONS.includes(draft.operation)) errors.operation = 'Selecciona Venta o Alquiler.';
  if (!PROPERTY_TYPES.includes(draft.type)) errors.type = 'Selecciona un tipo de propiedad válido.';
  if (!isWhole(draft.price) || Number(draft.price) > PROPERTY_LIMITS.price) errors.price = `Ingresa un precio entero entre 0 y ${PROPERTY_LIMITS.price.toLocaleString('es-GT')}.`;
  if (!isWhole(draft.area) || Number(draft.area) < PROPERTY_LIMITS.areaMin || Number(draft.area) > PROPERTY_LIMITS.areaMax) errors.area = `Ingresa un área entera entre ${PROPERTY_LIMITS.areaMin} y ${PROPERTY_LIMITS.areaMax.toLocaleString('es-GT')} m².`;
  if (!hasNoRooms(draft.type)) {
    for (const [key, label] of [['rooms', 'Las habitaciones'], ['baths', 'Los baños'], ['parking', 'Los parqueos']]) {
      if (!isWhole(draft[key]) || Number(draft[key]) > PROPERTY_LIMITS.counter) errors[key] = `${label} deben ser un número entero entre 0 y ${PROPERTY_LIMITS.counter}.`;
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(`${draft.date}T00:00:00Z`)) || new Date(`${draft.date}T00:00:00Z`).toISOString().slice(0, 10) !== draft.date) errors.date = 'Ingresa una fecha válida.';
  if (!draft.description?.trim()) errors.description = 'Escribe una descripción.';
  if (!draft.commercial?.trim()) errors.commercial = 'Escribe las condiciones comerciales (precio, requisitos, documentación).';
  if (!Array.isArray(draft.images) || draft.images.length < 1 || draft.images.length > PROPERTY_LIMITS.images || !draft.images.every(validUploadedImageUrl)) errors.images = `Se requieren entre 1 y ${PROPERTY_LIMITS.images} fotografías válidas.`;
  if (!Array.isArray(draft.renders) || draft.renders.length > PROPERTY_LIMITS.images || !draft.renders.every(validUploadedImageUrl)) errors.renders = `Se permiten hasta ${PROPERTY_LIMITS.images} renders válidos.`;
  if (draft.video && !parseYoutube(draft.video)) errors.video = 'Usa un enlace HTTPS válido de YouTube o deja el campo vacío.';
  if (typeof draft.published !== 'boolean') errors.published = 'Selecciona un estado válido.';
  return errors;
}

// `publish`: true si el usuario pulsó «Guardar y publicar»; `canPublish`: permiso properties.publish.
// Sin permiso nunca se envía published=true (el backend respondería 403).
export function makePropertyPayload(draft, { canPublish = false, publish = draft.published } = {}) {
  if (Object.keys(validatePropertyDraft(draft)).length) throw new TypeError('Revisa los campos de la propiedad.');
  const noRooms = hasNoRooms(draft.type);
  const count = (key) => (noRooms ? 0 : Number(draft[key]));
  return {
    title: draft.title.trim(), operation: draft.operation, type: draft.type, zone: draft.zone.trim(),
    location: draft.location.trim(), price: Number(draft.price), rooms: count('rooms'), baths: count('baths'),
    parking: count('parking'), area: Number(draft.area), date: draft.date, description: draft.description.trim(),
    commercial: draft.commercial.trim(), images: [...draft.images], renders: [...draft.renders],
    video: draft.video, demo: false, published: canPublish ? Boolean(publish) : false,
  };
}
