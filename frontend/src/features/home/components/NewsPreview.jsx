import { Link } from 'react-router-dom';
import { reference } from '../data/reference.js';
import { NewsPreviewCard } from './PreviewCards.jsx';

export function NewsPreview() {
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
        <div id="home-news" className="news-grid">
          {reference.news.map((news) => (
            <NewsPreviewCard key={news.id} news={news} />
          ))}
        </div>
      </div>
    </section>
  );
}
