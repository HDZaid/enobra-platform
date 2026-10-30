import { Link } from 'react-router-dom';
import { ParallaxImage } from '../../../components/ui/ParallaxImage.jsx';

export function HomeHero() {
  return (
    <section id="inicio" className="hero">
      <ParallaxImage
        factor={0.055}
        adaptive
        src="/assets/enobra/apartamento.jpg"
        alt="Casa contemporánea con ventanales amplios, jardín e iluminación cálida"
        fetchpriority="high"
        width="1800"
        height="1200"
      />
      <div className="hero-overlay"></div>
      <div className="container hero-content">
        <p className="eyebrow">ARQUITECTURA · INGENIERÍA · CONSTRUCCIÓN</p>
        <h1>
          Construimos
          <br />
          espacios con
          <br />
          <span>visión y calidad.</span>
        </h1>
        <p className="hero-description">
          Convertimos ideas en realidades, creando espacios seguros, funcionales y duraderos para un
          mejor futuro.
        </p>
        <div className="hero-actions">
          <Link to="/proyectos" className="button primary">
            Ver proyectos <span>→</span>
          </Link>
          <Link className="button outline" to="/contacto?asunto=Construcci%C3%B3n">
            Solicitar cotización
          </Link>
        </div>
        <div className="hero-bottom">
          <span className="micro">
            HOGARES &nbsp; | &nbsp; EMPRESAS &nbsp; | &nbsp; COMUNIDADES
          </span>
        </div>
      </div>
    </section>
  );
}
