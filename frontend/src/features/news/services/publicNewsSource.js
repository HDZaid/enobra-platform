import { demoNews } from '../data/demoNews.js';
import { newsService } from './newsService.js';
import { normalizeNews, readNewsPage } from './newsMapper.js';
import { paginateDemoNews, validNewsCategory } from '../utils/newsFilters.js';

// Solo contenido de muestra en desarrollo y ante red desconectada o API 501.
// En producción, los fallos de Django siempre se muestran al usuario.
const previewAllowed = import.meta.env?.DEV && import.meta.env?.VITE_NEWS_PREVIEW === 'true';

function canPreview(error) {
  return previewAllowed && (error?.status === 501 || (error instanceof TypeError && !('status' in error)));
}

export async function loadNewsPage({ page = 1, pageSize = 12, category = '', signal } = {}) {
  let response;
  try {
    const params = { page, page_size: pageSize };
    if (validNewsCategory(category)) params.category = category;
    response = await newsService.list(params, { signal });
  } catch (error) {
    if (signal?.aborted || !canPreview(error)) throw error;
    const sample = paginateDemoNews(demoNews, { page, pageSize, category: validNewsCategory(category) });
    return {
      items: sample.items.map(normalizeNews),
      count: sample.count,
      page,
      pageSize,
      preview: true,
    };
  }
  // No silenciar datos mal formados del backend con referencias.
  return { ...readNewsPage(response), preview: false };
}

export async function loadNewsDetail(id, { signal } = {}) {
  let response;
  try {
    response = await newsService.get(id, { signal });
  } catch (error) {
    if (signal?.aborted || !canPreview(error)) throw error;
    const sample = demoNews.find((entry) => entry.id === id);
    return { item: sample ? normalizeNews(sample) : null, preview: true };
  }
  return { item: normalizeNews(response), preview: false };
}
