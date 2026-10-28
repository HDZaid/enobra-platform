import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CatalogImage } from './CatalogImage.jsx';

export function ProjectCard({ project }) {
  return (
    <Link className="project-card" to={`/proyectos/${encodeURIComponent(project.id)}`}>
      <div className="project-image">
        <CatalogImage
          src={project.images[0]}
          alt={`${project.title}${project.demo ? ' · imagen de referencia' : ''}`}
          loading="lazy"
        />
        <span>
          Ver proyecto <ArrowUpRight aria-hidden="true" />
        </span>
      </div>
      <h3>{project.title}</h3>
      <p>
        {project.category} · {project.year}
        {project.demo && ' · Referencia'}
      </p>
    </Link>
  );
}
