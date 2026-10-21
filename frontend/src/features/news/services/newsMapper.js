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
    image: typeof item.image === 'string' ? item.image : '',
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
  if (typeof image !== 'string') return '';

  const value = image.trim();
  if (!value) return '';

  const hasInvalidCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0);
    return character === '\\' || code < 32 || code === 127;
  });

  if (hasInvalidCharacter) return '';

  // Local mockup images are served from Vite's public/ directory.
  if (value.startsWith('assets/')) return `/${value}`;

  // Relative URLs such as /media/... work through the Vite proxy in development.
  // Production must serve /media/ or return a full Storage URL from Django.
  if (value.startsWith('/')) {
    return value.startsWith('//') ? '' : value;
  }

  // Let Django choose the Storage provider; the frontend uses its public URL.
  if (!/^https?:\/\//i.test(value)) return '';

  try {
    const url = new URL(value);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return '';
    }

    return url.href;
  } catch {
    return '';
  }
}