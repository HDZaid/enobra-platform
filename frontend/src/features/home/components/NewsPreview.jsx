import { Link } from 'react-router-dom';
import { reference } from '../data/reference.js';
import { useReferenceResource } from '../../../components/ui/useReferenceResource.js';
import { ContentStatus } from '../../../components/ui/ContentStatus.jsx';
import { newsService } from '../../news/services/newsService.js';
import { readNewsPage } from '../../news/services/newsMapper.js';
import { NewsPreviewCard } from './PreviewCards.jsx';

const loadLatestNews = async (options) =>
  readNewsPage(await newsService.list({ page: 1, page_size: 3 }, options)).items;

export function NewsPreview() {
  const news = useReferenceResource(loadLatestNews, reference.news);
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
        <ContentStatus resource={news} />
        {news.status === 'ready' && news.data.length === 0 && <p>No hay noticias publicadas por el momento.</p>}
        <div id="home-news" className="news-grid">
          {news.data.map((news) => (
            <NewsPreviewCard key={news.id} news={news} />
          ))}
        </div>
      </div>
    </section>
  );
}
