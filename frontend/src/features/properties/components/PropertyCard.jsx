import { Link } from 'react-router-dom';
import { Bath, BedDouble, CarFront, Heart, MapPin, Ruler } from 'lucide-react';
import { CatalogImage } from '../../projects/components/CatalogImage.jsx';
import { formatPrice } from '../services/propertiesService.js';

export function PropertyFeatures({ property }) {
  const values = [
    [BedDouble, property.rooms, 'habitaciones'],
    [Bath, property.baths, 'baños'],
    [CarFront, property.parking, 'parqueos'],
    [Ruler, `${property.area} m²`, property.type === 'Terreno' ? 'de terreno' : 'de construcción'],
  ];
  return (
    <div className="geo-features">
      {values
        .filter((_, i) => property.type !== 'Terreno' || i === 3)
        .map(([Icon, value, label]) => (
          <span key={label} title={label} aria-label={`${value} ${label}`}>
            <Icon aria-hidden="true" />
            {value}
          </span>
        ))}
    </div>
  );
}

export function PropertyCard({ property, favorite, onFavorite, contactUrl }) {
  return (
    <article className="geo-property-card">
      <div className="geo-property-photo">
        <CatalogImage
          src={property.images[0]}
          alt={`${property.title}${property.demo ? ' · imagen de ejemplo' : ''}`}
          loading="lazy"
        />
        <span className={`geo-badge ${property.operation === 'Alquiler' ? 'geo-rental' : ''}`}>
          En {property.operation.toLowerCase()}
        </span>
        <button
          className="icon-button geo-favorite"
          aria-label={`Favorito: ${property.title}`}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Heart aria-hidden="true" />
        </button>
      </div>
      <div className="geo-property-body">
        <p className="geo-price">{formatPrice(property)}</p>
        <h3>{property.title}</h3>
        <p className="geo-location">
          <MapPin aria-hidden="true" />
          {property.zone} · {property.location}
        </p>
        {property.demo && <p className="small muted">Propiedad de ejemplo</p>}
        <PropertyFeatures property={property} />
        <Link className="geo-detail-link" to={`/bienes-raices/${property.id}`}>
          Ver detalles →
        </Link>
        {contactUrl && (
          <a className="geo-whatsapp" href={contactUrl} target="_blank" rel="noopener noreferrer">
            Consultar por WhatsApp ↗
          </a>
        )}
      </div>
    </article>
  );
}
