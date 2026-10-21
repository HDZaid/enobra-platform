import { useEffect } from 'react';
import { ArrowUpRight, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { companyService } from '../../../components/layout/services/companyService.js';
import { reference } from '../../../components/layout/data/reference.js';
import { useReferenceResource } from '../../../components/ui/useReferenceResource.js';
import { ContentStatus } from '../../../components/ui/ContentStatus.jsx';
import { ContactForm } from '../components/ContactForm.jsx';
import '../styles/contact-fonts.css';

const container = 'mx-auto w-[calc(100%-40px)] max-w-[1240px] md:w-[calc(100%-64px)] xl:w-[calc(100%-96px)]';

export function ContactPage() {
  const company = useReferenceResource(companyService.get, reference);
  const details = company.data;
  useEffect(() => {
    document.title = 'Contacto | EnObra';
  }, []);

  return (
    <div className="min-h-[70vh] bg-white font-['Inter',Arial,sans-serif] text-[#12233f]">
      <section className="relative overflow-hidden bg-[#f6f5f2] py-12 md:py-[70px] lg:pb-[88px]">
        <div className={`${container} relative z-10`}>
          <Link to="/" className="text-[13px] text-[#626b79] hover:text-[#b94308] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff6a1f]">
            Inicio / CONTACTO
          </Link>
          <p className="mt-7 mb-[18px] text-xs font-bold tracking-[0.19em] text-[#b94308]">CONTACTO</p>
          <h1 className="max-w-[950px] font-['Outfit',Arial,sans-serif] text-[clamp(37px,7vw,70px)] leading-[1.01] font-bold tracking-[-0.052em]">
            Hablemos de tu proyecto.
          </h1>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -top-1/3 -right-[10%] h-[170%] w-1/2 -skew-x-12 border-l border-[#12233f]/10" />
      </section>

      <section className="bg-[#f3f6fa] py-15 md:py-20 lg:py-24" aria-labelledby="contact-heading">
        <div className={`${container} grid items-start gap-12 lg:grid-cols-2 lg:gap-[100px]`}>
          <div>
            <p className="mb-[18px] text-xs font-bold tracking-[0.19em] text-[#b94308]">HABLEMOS DE TU PROYECTO</p>
            <h2 id="contact-heading" className="font-['Outfit',Arial,sans-serif] text-[clamp(30px,4vw,44px)] leading-[1.15] font-bold tracking-[-0.035em]">
              Las grandes ideas<br />empiezan conversando.
            </h2>
            <div className="my-7 h-[3px] w-[54px] bg-[#ff6a1f]" aria-hidden="true" />
            <div className="space-y-5 text-sm leading-[1.8] text-[#4c5665]">
              <p className="font-semibold text-[#12233f]">{details.person}</p>
              <p className="flex items-start gap-3"><MapPin className="mt-1 h-[18px] w-[18px] shrink-0 text-[#b94308]" aria-hidden="true" />{details.address}</p>
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-[18px] w-[18px] shrink-0 text-[#b94308]" aria-hidden="true" />
                <p>{details.phones.map((phone, index) => <span key={phone}>{index > 0 && ' · '}<a className="hover:underline focus-visible:outline-2" href={`tel:+502${phone.replace(/\D/g, '')}`}>{phone}</a></span>)}</p>
              </div>
              <p className="text-xs text-[#626b79]">{details.email ? <a href={`mailto:${details.email}`}>{details.email}</a> : 'Correo institucional: pendiente de confirmar.'}</p>
              <ContentStatus resource={company} />
              {details.whatsapp && <a className="inline-flex items-center gap-2 font-bold text-[#b94308] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                href={`https://wa.me/${details.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quisiera información sobre los servicios de EnObra.')}`}
                target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" /> Escríbenos por WhatsApp <ArrowUpRight size={16} aria-hidden="true" />
              </a>}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
