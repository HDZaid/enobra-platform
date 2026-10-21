// Utilidades puras del editor. Los datos de vista previa nunca se envían a Django.
export const newsCategories = Object.freeze(['Anuncios', 'Eventos', 'Proyectos']);
export const MAX_NEWS_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_NEWS_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function validNewsImageReference(value, { preview = false } = {}) {
  if (typeof value !== 'string' || value.length > 500 || !value.trim()) return false;
  const image = value.trim();
  if ([...image].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '\\')) return false;
  if (/^\/media\/[\w./-]+$/.test(image) && !image.includes('..')) return true;
  if (/^https:\/\/\S+$/i.test(image)) {
    try {
      const url = new URL(image);
      return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }
  if (preview && /^\/assets\/[\w./-]+$/.test(image) && !image.includes('..')) return true;
  if (preview && /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(image)) return true;
  return false;
}

export function validateNewsFile(file) {
  if (!file) return '';
  if (!ALLOWED_NEWS_IMAGE_TYPES.includes(file.type)) return 'La imagen debe ser JPG, PNG, WebP o GIF.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_NEWS_IMAGE_BYTES) {
    return 'Selecciona una imagen de hasta 10 MB.';
  }
  return '';
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateNewsDraft(draft, { preview = false, file = null } = {}) {
  const errors = {};
  const title = String(draft?.title ?? '').trim();
  const description = String(draft?.description ?? '').trim();
  if (!title || title.length > 160) errors.title = 'El título debe tener entre 1 y 160 caracteres.';
  if (!newsCategories.includes(draft?.category)) errors.category = 'Selecciona una categoría válida.';
  if (!isCalendarDate(draft?.date)) errors.date = 'Ingresa una fecha válida.';
  if (!description) errors.description = 'Escribe una descripción.';
  const fileError = validateNewsFile(file);
  if (fileError) errors.image = fileError;
  else if (!file && !validNewsImageReference(draft?.image, { preview })) {
    errors.image = preview
      ? 'Indica una URL HTTPS, una imagen del sitio o selecciona un archivo.'
      : 'Indica una URL HTTPS, una ruta /media/ o selecciona un archivo.';
  }
  return errors;
}

export function makeNewsPayload(draft, image) {
  if (!validNewsImageReference(image)) throw new TypeError('La referencia de imagen no es válida para Django.');
  const errors = validateNewsDraft({ ...draft, image });
  if (Object.keys(errors).length) throw new TypeError('La noticia tiene campos inválidos.');
  return {
    title: draft.title.trim(),
    category: draft.category,
    date: draft.date,
    description: draft.description.trim(),
    image: image.trim(),
    demo: Boolean(draft.demo),
    published: Boolean(draft.published),
  };
}

export function upsertPreviewNews(items, item) {
  if (items.some((current) => current.id === item.id)) {
    return items.map((current) => current.id === item.id ? { ...item } : current);
  }
  return [{ ...item }, ...items];
}

export function removePreviewNews(items, id) {
  return items.filter((item) => item.id !== id);
}

export function adminNewsImageSrc(value, preview = false) {
  if (preview && validNewsImageReference(value, { preview: true }) && value.startsWith('data:')) return value;
  if (preview && validNewsImageReference(value, { preview: true }) && value.startsWith('/assets/')) return value;
  return validNewsImageReference(value) ? value : '';
}

// Solo para la demostración: una transición de publicación no toca Django.
export function togglePreviewNewsPublished(items, id) {
  return items.map((item) => item.id === id ? { ...item, published: !item.published } : item);
}
