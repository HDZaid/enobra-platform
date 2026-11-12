import { Link } from 'react-router-dom';
import { newsImageUrl } from '../../news/services/newsMapper.js';
import { ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';
import { SafeImage } from '../../../components/ui/SafeImage.jsx';
import { NewsImage } from '../../news/components/NewsImage.jsx';

export function ProjectPreviewCard({ project }) {
  return (
    <Link className="project-card" to={`/proyectos/${encodeURIComponent(project.id)}`}>
      <div className="project-image">
        <SafeImage src={project.images[0]} alt="" loading="lazy" />
        <ImageLines variant="card" />
        <span>Ver proyecto ↗</span>
      </div>
      <div className="home-project-copy">
        <h3>{project.title}</h3>
        <p>{project.category} · {project.year}{project.demo && ' · Referencia'}</p>
      </div>
    </Link>
  );
}

export function NewsPreviewCard({ news }) {
  return (
    <Link className="news-card" to={`/noticias/${encodeURIComponent(news.id)}`}>
      <NewsImage key={news.image} src={newsImageUrl(news.image)} alt={news.title} className="home-news-image">
        <ImageLines variant="card" />
      </NewsImage>
      <div>
        <p className="eyebrow">{news.category}{news.demo && ' · REFERENCIA'}</p>
        <h3>{news.title}</h3>
        <p>{news.description.length > 115 ? `${news.description.slice(0, 115)}…` : news.description}</p>
        <span className="text-link">Leer más →</span>
      </div>
    </Link>
  );
}
