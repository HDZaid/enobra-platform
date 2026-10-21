import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';
import { ContentStatus } from '../../../components/ui/ContentStatus.jsx';
import { useReferenceResource } from '../../../components/ui/useReferenceResource.js';
import { servicesService } from '../services/servicesService.js';
import { reference } from '../data/reference.js';
import { ServiceFeature } from '../components/ServiceFeature.jsx';
import { ServiceIndex } from '../components/ServiceIndex.jsx';

export function ServicesPage() {
  const resource = useReferenceResource(servicesService.list, reference);
  const { data } = resource;
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [data, hash]);

  return (
    <MotionPage title="Servicios">
      <section className="page-intro services-intro">
        <div className="container services-intro-grid">
          <div>
            <Link to="/" className="breadcrumb">
              Inicio / SERVICIOS
            </Link>
            <p className="eyebrow">SERVICIOS INTEGRALES</p>
            <h1>
              Una sola visión.
              <br />
              <span>De la idea a la obra.</span>
            </h1>
          </div>
          <div className="services-intro-copy">
            <p>
              Acompañamos el proyecto completo con criterio técnico, coordinación y control en cada
              etapa.
            </p>
            <div className="services-intro-meta">
              <span>01—04</span>
              <small>DISEÑO · GESTIÓN · PRECONSTRUCCIÓN · EJECUCIÓN</small>
            </div>
          </div>
        </div>
      </section>
      <ServiceIndex services={data} />
      <section className="services-showcase">
        <div className="container">
          <div className="services-opening">
            <p className="eyebrow">NUESTRO ENFOQUE</p>
            <h2>Cada decisión cuenta antes, durante y después de construir.</h2>
            <p>
              El servicio no se limita a ejecutar una obra. Integramos diseño, planificación,
              recursos y seguimiento para mantener el proyecto alineado con sus objetivos.
            </p>
          </div>
          <div id="service-list">
            {data.map((service, index) => (
              <ServiceFeature key={service.id} service={service} index={index} />
            ))}
          </div>
          <ContentStatus resource={resource} />
          {data.length === 0 && <p>No hay servicios disponibles por el momento.</p>}
        </div>
      </section>
      <section className="page-intro services-ending" aria-labelledby="services-ending-title">
        <div className="container">
          <Link to="/" className="breadcrumb">
            Inicio / SERVICIOS
          </Link>
          <p className="eyebrow">SERVICIOS</p>
          <h2 id="services-ending-title">
            Experiencia en cada
            <br />
            etapa de tu proyecto.
          </h2>
          <p>Diseño, administración de proyectos, preconstrucción y construcción.</p>
        </div>
      </section>
      <div className="section services-ending-space" aria-hidden="true" />
    </MotionPage>
  );
}
