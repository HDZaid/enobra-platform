import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CatalogPage as MotionPage } from '../../projects/components/CatalogPage.jsx';
import { CatalogStatus } from '../../projects/components/CatalogStatus.jsx';
import { MediaGallery, CatalogVideo } from '../../projects/components/MediaGallery.jsx';
import { useCatalogResource } from '../../projects/components/useCatalogResource.js';
import { propertiesService, formatPrice } from '../services/propertiesService.js';
import { PropertyFeatures } from '../components/PropertyCard.jsx';
import { VisitDialog } from '../components/VisitDialog.jsx';
import { useCompanyContact } from '../components/useCompanyContact.js';
import '../../projects/styles/catalog.css';

export function PropertyDetailPage() {
  const { id } = useParams();
  const resource = useCatalogResource(propertiesService.get, id);
  const property = resource.data;
  const contactUrl = useCompanyContact()(property?.title || 'esta propiedad');
  const [visitId, setVisitId] = useState(null);
  return (
    <MotionPage title={property?.title || 'Detalle de propiedad'}>
      <div className="geo-catalog">
        <section className="section container geo-detail">
          <Link className="breadcrumb" to="/bienes-raices">
            ← Bienes raíces
          </Link>
          <CatalogStatus resource={resource} notFound="Propiedad no encontrada" />
          {property && (
            <>
              <p className="eyebrow">
                {property.operation} · {property.type}
                {property.demo && ' · EJEMPLO'}
              </p>
              <h1>{property.title}</h1>
              <p>
                {property.zone} · {property.location}
              </p>
              <MediaGallery key={`gallery-${property.id}`} item={property} />
              <div className="geo-detail-columns">
                <article>
                  <h2>Un lugar para tu próximo capítulo.</h2>
                  <p className="geo-prose">{property.description}</p>
                  <h3>Especificaciones comerciales</h3>
                  <p className="geo-prose">{property.commercial}</p>
                  <CatalogVideo src={property.video} title={property.title} />
                </article>
                <aside className="geo-property-summary">
                  <p className="geo-price">{formatPrice(property)}</p>
                  <PropertyFeatures property={property} />
                  <button className="button primary" onClick={() => setVisitId(property.id)}>
                    Solicitar visita →
                  </button>
                  {contactUrl ? (
                    <a
                      className="text-link"
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Consultar por WhatsApp ↗
                    </a>
                  ) : (
                    <Link className="text-link" to="/contacto?asunto=Bienes%20ra%C3%ADces">
                      Consultar sobre esta propiedad ↗
                    </Link>
                  )}
                </aside>
              </div>
              {visitId === property.id && (
                <VisitDialog
                  key={`visit-${property.id}`}
                  property={property}
                  onClose={() => setVisitId(null)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </MotionPage>
  );
}
