import { Link } from 'react-router-dom';
import { SafeImage } from '../../../components/ui/SafeImage.jsx';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';
import { useReferenceResource } from '../../../components/ui/useReferenceResource.js';
import { institutionService } from '../services/institutionService.js';
import { parseYoutube } from '../../projects/services/catalogMapper.js';
import { reference, aboutVideo } from '../data/reference.js';
import { AshlarRule, HeaderOrnament, ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';
export function AboutPage() {
  const resource = useReferenceResource(institutionService.get, reference);
  const { data } = resource;
  const video = parseYoutube(aboutVideo.url);
  return (
    <MotionPage title="Quiénes somos">
      <section className="page-intro enobra-intro">
        <div className="container enobra-intro-copy">
          <Link to="/" className="breadcrumb">
            Inicio / Nosotros
          </Link>
          <h1>
            Profesionalismo que
            <br />
            construye confianza.
          </h1>
        </div>
        <HeaderOrnament variant="fachada" />
      </section>
      {video && <figure className="container about-video-reference mb-0 mt-0">
        <div className="aspect-video overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--navy)]">
          <iframe className="h-full w-full border-0" src={`${video.embedUrl}?autoplay=1&mute=1&playsinline=1`} title={aboutVideo.title}
            loading="eager" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox" />
        </div>
        <figcaption className="mt-3 text-sm text-[var(--text-secondary)]">Video de referencia · Próximamente, el video institucional de EnObra.</figcaption>
      </figure>}
      <section className="section container institutional">
        <aside>
          <div className="image-lines-host">
            <SafeImage
              src="/assets/enobra/casa-lujo.png"
              alt="Vivienda de arquitectura contemporánea"
              loading="lazy"
            />
            <ImageLines variant="frame" />
          </div>
          <blockquote>“Más que una construcción, un hogar”.</blockquote>
          <Link className="text-link" to="/contacto">
            Conversemos →
          </Link>
        </aside>
        <article>
          <p className="eyebrow">PRESENTACIÓN</p>
          <h2>Nuestra historia.</h2>
          <div id="presentation" className="prose">
            {data.presentation.filter((text) => text.trim()).map((text, i) => (
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
        <AshlarRule className="principles-rule" />
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
