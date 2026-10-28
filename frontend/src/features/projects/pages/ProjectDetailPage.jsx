import { Link, useParams } from 'react-router-dom';
import { CatalogPage as MotionPage } from '../components/CatalogPage.jsx';
import { projectsService } from '../services/projectsService.js';
import { useCatalogResource } from '../components/useCatalogResource.js';
import { CatalogStatus } from '../components/CatalogStatus.jsx';
import { MediaGallery, CatalogVideo } from '../components/MediaGallery.jsx';
import '../styles/catalog.css';

export function ProjectDetailPage() {
  const { slug } = useParams();
  const resource = useCatalogResource(projectsService.get, slug);
  const project = resource.data;
  return (
    <MotionPage title={project?.title || 'Detalle del proyecto'}>
      <div className="geo-catalog">
        <section className="section container geo-detail">
          <Link to="/proyectos" className="breadcrumb">
            ← Portafolio de construcción
          </Link>
          <CatalogStatus resource={resource} notFound="Proyecto no encontrado" />
          {project && (
            <>
              <p className="eyebrow">
                {project.year} · {project.category}
              </p>
              <h1>{project.title}</h1>
              <p>
                {project.country}
                {project.demo && ' · Proyecto e imágenes de referencia'}
              </p>
              <MediaGallery key={project.id} item={project} />
              <div className="geo-description">
                <h2>Acerca del proyecto</h2>
                <p className="geo-prose">{project.description}</p>
                <CatalogVideo src={project.video} title={project.title} />
                <Link className="button primary" to="/contacto?asunto=Construcci%C3%B3n">
                  Conversemos sobre tu proyecto →
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </MotionPage>
  );
}
