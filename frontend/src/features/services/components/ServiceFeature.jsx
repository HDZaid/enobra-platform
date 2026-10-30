import { Link } from 'react-router-dom';
import { ParallaxImage } from '../../../components/ui/ParallaxImage.jsx';
import { ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';
import { mediaUrl } from '../../../components/ui/resourceValidation.js';

export function ServiceFeature({ service, index }) {
  const number = String(index + 1).padStart(2, '0');
  return (
    <article
      id={service.id}
      className={`service-feature${index % 2 ? ' service-feature--reverse' : ''}${service.id === 'construccion' ? ' service-feature--dark' : ''}`}
    >
      <div className="service-visual">
        <span className="service-visual-number" aria-hidden="true">
          {number}
        </span>
        <div className="service-image-frame">
          <ParallaxImage
            factor={0.025}
            src={mediaUrl(service.image)}
            alt={`Referencia visual de ${service.title}`}
            loading="lazy"
            decoding="async"
          />
          <ImageLines variant="frame" />
        </div>
        <span className="service-image-caption">ENOBRA · SERVICIO {number}</span>
      </div>
      <div className="service-content">
        <div className="service-kicker">
          <span>{number}</span>
          <i />
          <small>ETAPA DEL PROYECTO</small>
        </div>
        <h2>{service.title}</h2>
        <p className="service-lead">{service.short}</p>
        <div className="service-scope">
          <p>ALCANCE DEL SERVICIO</p>
          <ul>
            {service.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <Link
          className="service-cta"
          to={`/contacto?asunto=${encodeURIComponent(service.subject)}`}
        >
          <span>Consultar este servicio</span>
          <b aria-hidden="true">↗</b>
        </Link>
      </div>
    </article>
  );
}
