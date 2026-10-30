import { Link } from 'react-router-dom';
import { ParallaxImage } from '../../../components/ui/ParallaxImage.jsx';
import { ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';

export function BusinessAreas() {
  return (
    <section className="section tinted home-business-section">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DOS FORMAS DE ACOMPAÑARTE</p>
            <h2>De la idea al espacio ideal.</h2>
          </div>
        </div>
        <div className="business-grid">
          <Link to="/servicios" className="business-card">
            <ParallaxImage adaptive factor={0}
              src="/assets/enobra/construccion.jpg"
              alt="Trabajo de construcción"
              loading="lazy"
            />
            <ImageLines variant="card" />
            <div>
              <p className="eyebrow">CONSTRUCTORA</p>
              <h3>Diseñamos y construimos.</h3>
              <p>Diseño, administración de proyectos, preconstrucción y construcción.</p>
              <span className="text-link">Explorar servicios →</span>
            </div>
          </Link>
          <Link to="/bienes-raices" className="business-card">
            <ParallaxImage adaptive factor={0}
              src="/assets/enobra/bienes-raices.jpg"
              alt="Vivienda contemporánea ilustrativa"
              loading="lazy"
            />
            <div>
              <p className="eyebrow">BIENES RAÍCES</p>
              <h3>Tu próximo capítulo.</h3>
              <p>Compra, venta y alquiler de propiedades.</p>
              <span className="text-link">Explorar propiedades →</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
