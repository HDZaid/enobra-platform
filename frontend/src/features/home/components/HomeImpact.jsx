import { Link } from 'react-router-dom';
import { ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';
import { ParallaxImage } from '../../../components/ui/ParallaxImage.jsx';

export function HomeImpact() {
  return (
    <section className="impact-banner" aria-label="Filosofía de trabajo">
      <ParallaxImage
        factor={0.035}
        src="/assets/enobra/construccion.jpg"
        alt="Equipo trabajando en una obra de construcción"
        loading="lazy"
        decoding="async"
        width="1600"
        height="1200"
      />
      <div className="impact-overlay"></div>
      <ImageLines variant="arcade" />
      <div className="container impact-content">
        <p className="eyebrow">PROFESIONALISMO · CALIDAD · FUNCIONALIDAD</p>
        <h2>
          Una visión clara.
          <br />
          Un proyecto bien ejecutado.
        </h2>
        <p>
          Integramos cada etapa para que las ideas lleguen a obra con orden, criterio y atención al
          detalle.
        </p>
        <Link className="button impact-button" to="/contacto?asunto=Construcci%C3%B3n">
          Hablemos de tu proyecto <span>→</span>
        </Link>
      </div>
    </section>
  );
}
