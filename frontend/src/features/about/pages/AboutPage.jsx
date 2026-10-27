import { Link } from 'react-router-dom';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';
import { ContentStatus } from '../../../components/ui/ContentStatus.jsx';
import { useReferenceResource } from '../../../components/ui/useReferenceResource.js';
import { institutionService } from '../services/institutionService.js';
import { reference } from '../data/reference.js';
export function AboutPage() {
  const resource = useReferenceResource(institutionService.get, reference);
  const { data } = resource;
  return (
    <MotionPage title="Quiénes somos">
      <section className="page-intro">
        <div className="container">
          <Link to="/" className="breadcrumb">
            Inicio / NOSOTROS
          </Link>
          <p className="eyebrow">NOSOTROS</p>
          <h1>
            Profesionalismo que
            <br />
            construye confianza.
          </h1>
        </div>
      </section>
      <section className="section container institutional">
        <aside>
          <img
            src="/assets/enobra/casa-lujo.png"
            alt="Vivienda de arquitectura contemporánea"
            loading="lazy"
          />
          <blockquote>“Más que una construcción, un hogar”.</blockquote>
          <Link className="text-link" to="/contacto">
            Conversemos →
          </Link>
        </aside>
        <article>
          <ContentStatus resource={resource} />
          <p className="eyebrow">PRESENTACIÓN</p>
          <h2>Nuestra historia.</h2>
          <div id="presentation" className="prose">
            {data.presentation.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>
          <div id="signature" className="signature">
            <strong>Equipo EnObra</strong>
          </div>
        </article>
      </section>
      <section className="section tinted">
        <div className="container mission-grid">
          <article>
            <p className="eyebrow">NUESTRA MISIÓN</p>
            <h2>Calidad para nuestra región.</h2>
            <p id="mission" className="prose">
              {data.mission}
            </p>
          </article>
          <article>
            <p className="eyebrow">NUESTRA VISIÓN</p>
            <h2>Dar el máximo en cada proyecto.</h2>
            <div id="vision" className="prose">
              {data.vision.split('\n\n').map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          </article>
        </div>
      </section>
      <section className="section container">
        <p className="eyebrow">PRINCIPIOS CORPORATIVOS</p>
        <h2>Lo que guía nuestro trabajo.</h2>
        <div id="principles" className="principles-grid">
          {data.principles.map((principle, i) => (
            <article key={i}>
              <span className="principle-number">{String(i + 1).padStart(2, '0')}</span>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>
    </MotionPage>
  );
}
