import { demoNews } from '../data/demoNews.js';
import { newsService } from './newsService.js';
import { normalizeNews, readNewsPage } from './newsMapper.js';

// Solo contenido de muestra en desarrollo y ante red desconectada o API 501.
// En producción, los fallos de Django siempre se muestran al usuario.
const previewAllowed = import.meta.env?.DEV && import.meta.env?.VITE_NEWS_PREVIEW !== 'false';

function canPreview(error) {
  return previewAllowed && (error?.status === 501 || (error instanceof TypeError && !('status' in error)));
}

export async function loadNewsPage({ page = 1, pageSize = 12, signal } = {}) {
  let response;
  try {
    response = await newsService.list({ page, page_size: pageSize }, { signal });
  } catch (error) {
    if (signal?.aborted || !canPreview(error)) throw error;
    const first = (page - 1) * pageSize;
    return {
      items: demoNews.slice(first, first + pageSize).map(normalizeNews),
      count: demoNews.length,
      page,
      pageSize,
      preview: true,
    };
  }
  // No silenciar datos mal formados del backend con ejemplos.
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
