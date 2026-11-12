import { Link } from 'react-router-dom';
import { useCatalogResource } from '../../projects/components/useCatalogResource.js';
import { loadNewsPage } from '../../news/services/publicNewsSource.js';
import { NewsPreviewCard } from './PreviewCards.jsx';

const loadLatestNews = async (_key, { signal }) => {
  const page = await loadNewsPage({ pageSize: 3, signal });
  return page.items.filter((news) => news.published);
};

export function NewsPreview() {
  const news = useCatalogResource(loadLatestNews, 'latest');
  return (
    <section className="section tinted home-news-section">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NOTICIAS Y EVENTOS</p>
            <h2>Lo que viene en EnObra.</h2>
          </div>
          <Link className="text-link" to="/noticias">
            Ver novedades →
          </Link>
        </div>

        {news.data?.length ? (
          <div id="home-news" className="news-grid">
            {news.data.map((item) => <NewsPreviewCard key={item.id} news={item} />)}
          </div>
        ) : (
          <p className="small muted" role="status">
            {news.status === 'loading'
              ? 'Cargando noticias…'
              : news.status === 'error'
                ? 'No pudimos cargar las noticias.'
                : 'No hay noticias publicadas por el momento.'}
          </p>
        )}
      </div>
    </section>
  );
}
