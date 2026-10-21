// Reglas editoriales locales: no cambian el contrato de Django.
const EDITABLE_FIELDS = ['title', 'category', 'date', 'description', 'image', 'demo', 'published'];

export function newsDraftHasChanges(original, current, file = null) {
  if (file) return true;
  return EDITABLE_FIELDS.some((key) => original?.[key] !== current?.[key]);
}

export function newsPreviewContent(draft, image = '') {
  return {
    title: String(draft?.title ?? '').trim() || 'Título de la publicación',
    category: String(draft?.category ?? '').trim() || 'Sin categoría',
    date: String(draft?.date ?? ''),
    description: String(draft?.description ?? '').trim() || 'Aquí aparecerá el contenido de la noticia.',
    image: image || String(draft?.image ?? ''),
    published: Boolean(draft?.published),
  };
}

export function filterNewsByPublication(items, status = 'all') {
  if (status === 'published') return items.filter((item) => item.published === true);
  if (status === 'draft') return items.filter((item) => item.published === false);
  return items;
}

export { formatNewsDate } from '../../news/utils/newsDate.js';
