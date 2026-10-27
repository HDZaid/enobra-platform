import { Brand } from './Brand.jsx';
import { Navbar } from './Navbar.jsx';
import { ContentStatus } from '../ui/ContentStatus.jsx';
import { externalUrl } from '../ui/resourceValidation.js';

export function Footer({ resource }) {
  const company = resource.data;
  return (
    <div className="leo-chrome">
      <footer>
        <div className="container footer-top">
          <div>
            <Brand company={company} footer />
            <div className="contact-info">
              <p>{company.address}</p>
              <p>
                {company.phones.map((phone, index) => (
                  <span key={index}>
                    {index > 0 && ' · '}
                    <a href={`tel:+502${phone.replace(/\D/g, '')}`}>{phone}</a>
                  </span>
                ))}
              </p>
              <p>
                {company.email ? (
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                ) : (
                  'Correo institucional: pendiente de confirmar.'
                )}
              </p>
              {company.whatsapp && (
                <a
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quisiera información sobre los servicios de EnObra.')}`}
                >
                  Escríbenos por WhatsApp ↗
                </a>
              )}
              {['instagram', 'facebook']
                .filter((key) => externalUrl(company[key]))
                .map((key) => (
                  <p key={key}>
                    <a href={company[key]} target="_blank" rel="noopener noreferrer">
                      {key === 'instagram' ? 'Instagram' : 'Facebook'} ↗
                    </a>
                  </p>
                ))}
            </div>
            <ContentStatus resource={resource} />
          </div>
          <div className="footer-motto">
            Ad maiorem Dei gloriam
            <i />
          </div>
          <div className="footer-manifesto">
            CONSTRUIMOS
            <br />
            HOY
            <br />
            MEJORES
            <br />
            <span>MAÑANAS.</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} EnObra. Todos los derechos reservados.</p>
          <Navbar footer />
        </div>
      </footer>
    </div>
  );
}
