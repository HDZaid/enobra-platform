import { Zap, Droplets, Settings, MapPinned, Ruler, HardHat, Package, Truck, Users, Wallet, CalendarDays, ChartNoAxesCombined, GitCompareArrows, MessageSquare, ClipboardCheck } from 'lucide-react';
import { serviceIconName } from '../utils/serviceIcons.js';
import { Link } from 'react-router-dom';
import { ParallaxImage } from '../../../components/ui/ParallaxImage.jsx';
import { ImageLines } from '../../../components/ui/ColonialOrnaments.jsx';
import { mediaUrl } from '../../../components/ui/resourceValidation.js';

const icons = { Zap, Droplets, Settings, MapPinned, Ruler, HardHat, Package, Truck, Users, Wallet, CalendarDays, ChartNoAxesCombined, GitCompareArrows, MessageSquare, ClipboardCheck };

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
        {service.items.some((item) => item.trim()) && <div className="service-scope">
          <p>ALCANCE DEL SERVICIO</p>
          <ul>
            {service.items.filter((item) => item.trim()).map((item, index) => {
              const Icon = icons[serviceIconName(item)];
              return <li key={index}><Icon size={18} strokeWidth={1.75} aria-hidden="true" className="service-item-icon shrink-0" /><span>{item}</span></li>;
            })}
          </ul>
        </div>}
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
