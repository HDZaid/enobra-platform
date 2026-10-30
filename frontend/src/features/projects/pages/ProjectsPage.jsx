import { HeaderOrnament } from '../../../components/ui/ColonialOrnaments.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogPage as MotionPage } from '../components/CatalogPage.jsx';
import { projectsService } from '../services/projectsService.js';
import { useCatalogResource } from '../components/useCatalogResource.js';
import { CatalogStatus, Pagination } from '../components/CatalogStatus.jsx';
import { ProjectCard } from '../components/ProjectCard.jsx';
import '../styles/catalog.css';

const loadProjects = (query, options) =>
  projectsService.list(Object.fromEntries(new URLSearchParams(query)), options);
const loadYears = (_key, options) => projectsService.years(options);

export function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const year = /^\d{4}$/.test(params.get('year') || '') ? params.get('year') : '';
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const resource = useCatalogResource(loadProjects, new URLSearchParams({ year, page }).toString());
  const years = useCatalogResource(loadYears, 'years');
  const options = [...new Set([...(years.data || []), ...(year ? [Number(year)] : [])])].sort(
    (a, b) => b - a,
  );
  return (
    <MotionPage title="Portafolio de construcción">
      <div className="geo-catalog">
        <section className="page-intro enobra-intro">
          <div className="container enobra-intro-copy">
            <Link className="breadcrumb" to="/">
              Inicio / Portafolio
            </Link>
            <h1>
              Obras y proyectos
              <br />
              arquitectónicos.
            </h1>
            <p>Explora el portafolio por año y conoce el alcance de cada proyecto.</p>
          </div>
          <HeaderOrnament variant="volumen" />
        </section>
        <section className="section container">
          <div className="geo-filter-top">
            <label>
              Año del proyecto
              <select
                value={year}
                onChange={(e) => setParams(e.target.value ? { year: e.target.value } : {})}
              >
                <option value="">Todos los años</option>
                {options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {years.status === 'error' && (
              <button className="text-link" onClick={years.retry}>
                Reintentar carga de años
              </button>
            )}
          </div>
          <CatalogStatus resource={resource} />
          {resource.status === 'ready' && (
            <>
              <p className="geo-result-count" role="status">
                {resource.data.count} {resource.data.count === 1 ? 'proyecto' : 'proyectos'}
              </p>
              {resource.data.results.length ? (
                <div className="projects-grid">
                  {resource.data.results.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="geo-status">
                  <h2>No hay proyectos disponibles</h2>
                  <p>Prueba otro año o vuelve más adelante.</p>
                  <button className="text-link" onClick={() => setParams({})}>
                    Ver todo el portafolio
                  </button>
                </div>
              )}
              <Pagination
                data={resource.data}
                onPage={(next) => setParams({ ...(year ? { year } : {}), page: String(next) })}
              />
            </>
          )}
        </section>
      </div>
    </MotionPage>
  );
}
