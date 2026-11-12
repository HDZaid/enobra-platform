import { Brand } from './Brand.jsx';
import { Navbar } from './Navbar.jsx';
import { AshlarRule } from '../ui/ColonialOrnaments.jsx';
import { externalUrl } from '../ui/resourceValidation.js';
import { catalogWhatsAppLink, whatsappLink } from '../../services/whatsapp.js';

export function Footer({ resource, catalogContact }) {
  const company = resource.data;
  const contactUrl = catalogContact
    ? catalogWhatsAppLink(company.whatsapp, catalogContact.kind, catalogContact.item, window.location.origin)
    : whatsappLink(company.whatsapp);
  return (
    <div className="leo-chrome">
      <footer>
        <AshlarRule className="ashlar-brand" brand />
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
              {company.email.trim() && <p><a href={`mailto:${company.email}`}>{company.email}</a></p>}
              {contactUrl && (
                <a
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={contactUrl}
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

          </div>
          <div className="footer-motto">
            Ad maiorem Dei gloriam
            <i />
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
