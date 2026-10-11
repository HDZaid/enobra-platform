import { Link } from 'react-router-dom';
import { reference } from '../data/reference.js';
import { ProjectPreviewCard } from './PreviewCards.jsx';

export function PortfolioPreview() {
  return (
    <section className="section container portfolio-showcase">
      <div className="section-heading">
        <div>
          <p className="eyebrow">UNA MIRADA AL PORTAFOLIO</p>
          <h2>Espacios que inspiran.</h2>
        </div>
        <Link className="text-link" to="/proyectos">
          Ver proyectos →
        </Link>
      </div>
      <div id="home-projects" className="projects-grid">
        {reference.projects.map((project) => (
          <ProjectPreviewCard key={project.id} project={project} />
        ))}
      </div>
      <p className="small muted">Imágenes y proyectos de ejemplo.</p>
    </section>
  );
}
