import { Link } from 'react-router-dom';

export function HomeStory() {
  return (
    <section id="proposito" className="section container home-about editorial-split">
      <div className="home-about-copy">
        <p className="eyebrow">CONSTRUIMOS CON PROPÓSITO</p>
        <h2>
          Más que una construcción,
          <br />
          <span>un hogar.</span>
        </h2>
        <p className="home-about-lead">
          Desde 2003, EnObra desarrolla proyectos con una visión profesional que integra diseño,
          planificación y construcción para crear espacios funcionales y duraderos.
        </p>
        <Link className="text-link" to="/nosotros">
          Conocer nuestra historia <span>→</span>
        </Link>
        <div className="home-proof" aria-label="Datos de EnObra">
          <div>
            <strong>Desde 2003</strong>
            <small>Trayectoria en construcción</small>
          </div>
          <div>
            <strong>Quetzaltenango</strong>
            <small>Origen y sede de operación</small>
          </div>
          <div>
            <strong>Sur occidente</strong>
            <small>Región de servicio</small>
          </div>
        </div>
      </div>
      <figure className="home-about-visual">
        <div className="image-frame">
          <img
            src="/assets/enobra/IMG-20260910-WA0082.jpg"
            alt="Referencia fotográfica de vivienda y obra"
            loading="lazy"
            decoding="async"
            width="1200"
            height="1600"
          />
        </div>
        <figcaption>EN OBRA · QUETZALTENANGO</figcaption>
      </figure>
    </section>
  );
}
