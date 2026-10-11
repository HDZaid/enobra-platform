// Adaptación explícita al contrato { count, page, page_size, results } de Django.
export function normalizeNews(item) {
  if (!item || typeof item !== 'object' || !item.id || !item.title) {
    throw new TypeError('La noticia recibida no contiene los campos obligatorios.');
  }

  return {
    id: String(item.id),
    title: String(item.title),
    category: String(item.category || ''),
    date: String(item.date || ''),
    description: String(item.description || ''),
    image: String(item.image || ''),
    demo: item.demo === true,
    published: item.published !== false,
  };
}

export function readNewsPage(payload) {
  if (!payload || !Array.isArray(payload.results)) {
    throw new TypeError('La API de noticias no devolvió una página válida.');
  }

  return {
    items: payload.results.map(normalizeNews),
    count: Number(payload.count ?? payload.results.length),
    page: Number(payload.page ?? 1),
    pageSize: Number(payload.page_size ?? 12),
  };
}

export function newsImageUrl(image) {
  if (!image) return '';
  // Imagen de la carpeta public del mockup y recursos remotos del Storage.
  if (image.startsWith('assets/')) return `/${image}`;
  if (image.startsWith('/')) return image.startsWith('//') ? '' : image;
  if (/^https?:\/\//i.test(image)) return image;
  return '';
}
