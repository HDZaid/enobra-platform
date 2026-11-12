import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectGrid } from '../../projects/components/ProjectGrid.jsx';
import { useCatalogResource } from '../../projects/components/useCatalogResource.js';
import { publicProjects } from '../../projects/services/projectsService.js';
import { ProjectPreviewCard } from './PreviewCards.jsx';

const { list } = publicProjects;

export function PortfolioPreview() {
  const resource = useCatalogResource(list.load, 'year=&page=1', list.read);
  const projects = resource.data?.results.filter((project) => project.published).slice(0, 3) || [];

  return (
    <section className="section container portfolio-showcase">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROYECTOS Y PORTAFOLIO</p>
          <h2>Espacios que inspiran.</h2>
        </div>
        <Link className="text-link" to="/proyectos">
          Ver proyectos →
        </Link>
      </div>
      {projects.length ? (
        <ProjectGrid id="home-projects" className={projects.length === 1 ? 'home-projects--single' : ''}>
          {projects.map((project) => (
            <ProjectPreviewCard key={project.id} project={project} />
          ))}
          {projects.length < 3 && (
            <Link className="home-portfolio-link" to="/proyectos">
              <span>Observa nuestros proyectos y portafolio</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </ProjectGrid>
      ) : (
        <p className="small muted" role="status">
          {resource.status === 'loading'
            ? 'Cargando proyectos…'
            : resource.status === 'error'
              ? 'No pudimos cargar los proyectos.'
              : 'No hay proyectos publicados por el momento.'}
        </p>
      )}
    </section>
  );
}
