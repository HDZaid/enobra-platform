import { Link } from 'react-router-dom';

export function ProjectPreviewCard({ project }) {
  return (
    <Link className="project-card" to={`/proyectos/${encodeURIComponent(project.id)}`}>
      <div className="project-image">
        <img src={project.images[0]} alt={`${project.title} · imagen de ejemplo`} loading="lazy" />
        <span>Ver proyecto ↗</span>
      </div>
      <h3>{project.title}</h3>
      <p>
        {project.category} · {project.year} · Ejemplo
      </p>
    </Link>
  );
}

export function NewsPreviewCard({ news }) {
  return (
    <Link className="news-card" to={`/noticias/${encodeURIComponent(news.id)}`}>
      <img src={news.image} alt={news.title} loading="lazy" />
      <div>
        <p className="eyebrow">{news.category} · EJEMPLO</p>
        <h3>{news.title}</h3>
        <p>{news.description.slice(0, 115)}…</p>
        <span className="text-link">Leer más →</span>
      </div>
    </Link>
  );
}
