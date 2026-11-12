import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogImage } from './CatalogImage.jsx';
import { CatalogPreview } from './CatalogPreview.jsx';

export function ProjectCard({ project }) {
  const [preview, setPreview] = useState(null);
  const to = `/proyectos/${encodeURIComponent(project.id)}`;
  return (
    <article className="project-card">
      <div className="project-image">
        <CatalogImage
          src={project.images[0]}
          alt={`${project.title}${project.demo ? ' · imagen de referencia' : ''}`}
          loading="lazy"
        />
        <button type="button" className="geo-preview-trigger" aria-label={`Ver fotos de ${project.title}`} aria-haspopup="dialog" onClick={(event) => setPreview(event.detail > 0 ? 'pointer' : 'keyboard')}>
          <span>Ver fotos</span>
        </button>
      </div>
      <h3><Link to={to}>{project.title}</Link></h3>
      <p>{project.category} · {project.year}{project.demo && ' · Referencia'}</p>
      {preview && <CatalogPreview item={project} to={to} summary={`${project.category} · ${project.year}`} animateEntry={preview === 'pointer'} onClose={() => setPreview(null)} />}
    </article>
  );
}
