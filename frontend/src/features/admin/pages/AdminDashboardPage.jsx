import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, FileText, Mail, Newspaper, Plus, Building2 } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { inquiriesService } from '../services/inquiriesService.js';
import { newsService } from '../../news/services/newsService.js';
import { adminRoleProfile, canAccessAdminSection, displayAdminCount, readAdminCollection } from '../utils/adminData.js';

const stats = [
  { label: 'Noticias', key: 'news', icon: Newspaper, link: routePaths.adminNews, section: 'news' },
  { label: 'Mensajes', key: 'messages', icon: Mail, link: routePaths.adminInbox, section: 'inbox' },
  { label: 'Proyectos', key: 'projects', icon: Building2 },
  { label: 'Propiedades', key: 'properties', icon: FileText },
];

const steps = [
  { title: 'Noticias', description: 'Crear y editar noticias; en vista previa, los cambios son temporales.', link: routePaths.adminNews, section: 'news' },
  { title: 'Mensajes', description: 'Ver las consultas y su estado de atención.', link: routePaths.adminInbox, section: 'inbox' },
  { title: 'Imágenes', description: 'El editor permite subir imágenes mediante la API de medios. Verificar el proveedor de Storage en el entorno real.', link: null, section: 'news' },
  { title: 'Bienes raíces', description: 'Tu rol puede preparar o publicar propiedades según sus permisos. El formulario administrativo de propiedades se habilitará cuando se integre ese módulo.', link: null, section: 'properties', onlyWithout: 'news' },
];

export function AdminDashboardPage() {
  const { session, preview, previewNews, previewInquiries } = useOutletContext();
  const [counts, setCounts] = useState({ news: null, messages: null });
  const [warning, setWarning] = useState('');
  const user = session?.user;
  const can = (section) => preview || canAccessAdminSection(user, section);
  const canNews = can('news');
  const canInbox = can('inbox');

  useEffect(() => {
    document.title = 'Resumen administrativo | EnObra';
    if (preview) return undefined;
    let active = true;
    async function load() {
      // Solo se consultan los módulos que Django autoriza para el rol; el resto produciría 403.
      const skipped = Promise.resolve(null);
      const [newsResult, inquiriesResult] = await Promise.allSettled([
        canNews ? newsService.list({ page: 1, page_size: 1 }, { token: session.access }) : skipped,
        canInbox ? inquiriesService.list({ page: 1, page_size: 1 }, session.access) : skipped,
      ]);
      if (!active) return;
      let news = null;
      let messages = null;
      try { if (canNews && newsResult.status === 'fulfilled') news = readAdminCollection(newsResult.value).count; } catch { /* Contrato no válido. */ }
      try { if (canInbox && inquiriesResult.status === 'fulfilled') messages = readAdminCollection(inquiriesResult.value).count; } catch { /* Contrato no válido. */ }
      setCounts({ news, messages });
      const missing = (canNews && news === null) || (canInbox && messages === null);
      setWarning(missing ? 'Algunos indicadores no están disponibles. El backend aún puede tener módulos pendientes de implementación.' : '');
    }
    void load();
    return () => { active = false; };
  }, [session, preview, canNews, canInbox]);

  const values = preview ? { news: previewNews.length, messages: previewInquiries.length } : counts;
  const visibleStats = stats.filter(({ section }) => !section || can(section));
  const visibleSteps = steps.filter(({ section, onlyWithout }) => can(section) && !(onlyWithout && can(onlyWithout)));
  const profile = adminRoleProfile(user);
  const intro = canNews || canInbox
    ? 'Administra las noticias de EnObra y consulta las solicitudes que envían los visitantes. Proyectos y propiedades se integrarán con los módulos del equipo.'
    : `Iniciaste sesión como ${profile.label} (${profile.description.toLocaleLowerCase('es')}). Noticias y Mensajes requieren acceso administrativo completo; tus opciones de bienes raíces aparecerán aquí cuando se integre ese módulo.`;

  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-[#12233f] to-[#304e7d] p-7 text-white sm:p-9">
        <p className="text-[11px] font-bold tracking-[.17em] text-[#ffab7d] uppercase">EnObra · Panel de control{!preview && ` · ${profile.label}`}</p>
        <h2 className="mt-4 font-['Outfit',Arial,sans-serif] text-[clamp(30px,4vw,44px)] font-semibold leading-tight">Tu contenido,<br/>en un solo lugar.</h2>
        <p className="mt-4 max-w-[640px] text-sm leading-relaxed text-white/75">{intro}</p>
        {(canNews || canInbox) && <div className="mt-7 flex flex-wrap gap-3">
          {canNews && <Link to={routePaths.adminNews} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308]"><Newspaper size={17}/> Gestionar noticias</Link>}
          {canInbox && <Link to={routePaths.adminInbox} className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><Mail size={17}/> Revisar mensajes</Link>}
        </div>}
      </section>
      {warning && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] px-4 py-3 text-sm text-[#88420d]">{warning}</p>}
      <section aria-label="Indicadores" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {visibleStats.map(({ key, label, icon: Icon, link }, index) => {
          const content = <><Icon size={23} className="text-[#304e7d]" aria-hidden="true"/><span className="mt-3 block font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">{displayAdminCount(values[key])}</span><span className="block text-xs text-[#626b79]">{label}</span></>;
          const cls = `rounded-xl border-l-4 bg-white p-5 text-left shadow-sm ${index % 2 ? 'border-[#ff6a1f]' : 'border-[#304e7d]'}`;
          return link ? <Link key={key} to={link} className={`${cls} transition-shadow hover:shadow-md`}>{content}</Link> : <div key={key} className={cls}>{content}</div>;
        })}
      </section>
      {visibleSteps.length > 0 && <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="font-['Outfit',Arial,sans-serif] text-xl font-semibold">Próximos pasos</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {visibleSteps.map(({ title, description, link }, index) => <div key={title} className="rounded-lg bg-[#f3f6fa] p-5"><span className="flex size-8 items-center justify-center rounded-full bg-[#ff6a1f] text-xs font-bold text-white">{String(index + 1).padStart(2, '0')}</span><h4 className="mt-4 font-semibold">{title}</h4><p className="mt-2 text-sm leading-relaxed text-[#626b79]">{description}</p>{link && <Link to={link} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#b94308]">Abrir <ArrowRight size={15}/></Link>}</div>)}
        </div>
        {canNews && <p className="mt-5 flex items-center gap-2 text-xs text-[#626b79]"><Plus size={15}/> En vista previa los cambios no se guardan. Las imágenes reales se suben mediante el endpoint de medios de Django.</p>}
      </section>}
    </div>
  );
}
