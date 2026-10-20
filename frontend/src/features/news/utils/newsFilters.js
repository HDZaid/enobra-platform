// Las categorías coinciden con NewsCategory del contrato Django.
export const NEWS_CATEGORIES = Object.freeze(['Anuncios', 'Eventos', 'Proyectos']);

export function validNewsCategory(value) {
  return NEWS_CATEGORIES.includes(value) ? value : '';
}

export function paginateDemoNews(items, { category = '', page = 1, pageSize = 12 } = {}) {
  const filtered = category ? items.filter((item) => item.category === category) : items;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), count: filtered.length };
}

export function nextNewsQuery(searchParams, { page, category } = {}) {
  const next = new URLSearchParams(searchParams);
  if (category !== undefined) {
    const normalized = validNewsCategory(category);
    if (normalized) next.set('category', normalized);
    else next.delete('category');
    next.delete('page');
  }
  if (page !== undefined) {
    if (page > 1 && Number.isSafeInteger(page)) next.set('page', String(page));
    else next.delete('page');
  }
  return next;
}
