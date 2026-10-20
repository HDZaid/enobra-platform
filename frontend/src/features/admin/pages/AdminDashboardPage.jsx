import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, FileText, Mail, Newspaper, Plus, Building2 } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { inquiriesService } from '../services/inquiriesService.js';
import { newsService } from '../../news/services/newsService.js';
import { displayAdminCount, readAdminCollection } from '../utils/adminData.js';

const stats = [
  { label: 'Noticias', key: 'news', icon: Newspaper, link: routePaths.adminNews },
  { label: 'Mensajes', key: 'messages', icon: Mail, link: routePaths.adminInbox },
  { label: 'Proyectos', key: 'projects', icon: Building2 },
  { label: 'Propiedades', key: 'properties', icon: FileText },
];

export function AdminDashboardPage() {
  const { session, preview, previewNews, previewInquiries } = useOutletContext();
  const [counts, setCounts] = useState({ news: null, messages: null });
  const [warning, setWarning] = useState('');

  useEffect(() => {
    document.title = 'Resumen administrativo | EnObra';
    if (preview) return;
    let active = true;
    async function load() {
      const [newsResult, inquiriesResult] = await Promise.allSettled([
        newsService.list({ page: 1, page_size: 1 }, { token: session.access }),
        inquiriesService.list({ page: 1, page_size: 1 }, session.access),
      ]);
      if (!active) return;
      let news = null;
      let messages = null;
      try { if (newsResult.status === 'fulfilled') news = readAdminCollection(newsResult.value).count; } catch { /* Contrato no válido. */ }
      try { if (inquiriesResult.status === 'fulfilled') messages = readAdminCollection(inquiriesResult.value).count; } catch { /* Contrato no válido. */ }
      setCounts({ news, messages });
      setWarning(news === null || messages === null ? 'Algunos indicadores no están disponibles. El backend aún puede tener módulos pendientes de implementación.' : '');
    }
    void load();
    return () => { active = false; };
  }, [session, preview]);

  const values = preview ? { news: previewNews.length, messages: previewInquiries.length } : counts;
  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-[#12233f] to-[#304e7d] p-7 text-white sm:p-9">
        <p className="text-[11px] font-bold tracking-[.17em] text-[#ffab7d] uppercase">EnObra · Panel de control</p>
        <h2 className="mt-4 font-['Outfit',Arial,sans-serif] text-[clamp(30px,4vw,44px)] font-semibold leading-tight">Tu contenido,<br/>en un solo lugar.</h2>
        <p className="mt-4 max-w-[640px] text-sm leading-relaxed text-white/75">Administra las noticias de EnObra y consulta las solicitudes que envían los visitantes. Proyectos y propiedades se integrarán con los módulos del equipo.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to={routePaths.adminNews} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308]"><Newspaper size={17}/> Gestionar noticias</Link>
          <Link to={routePaths.adminInbox} className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><Mail size={17}/> Revisar mensajes</Link>
        </div>
      </section>
      {warning && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] px-4 py-3 text-sm text-[#88420d]">{warning}</p>}
      <section aria-label="Indicadores" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ key, label, icon: Icon, link }, index) => {
          const content = <><Icon size={23} className="text-[#304e7d]" aria-hidden="true"/><span className="mt-3 block font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">{displayAdminCount(values[key])}</span><span className="block text-xs text-[#626b79]">{label}</span></>;
          const cls = `rounded-xl border-l-4 bg-white p-5 text-left shadow-sm ${index % 2 ? 'border-[#ff6a1f]' : 'border-[#304e7d]'}`;
          return link ? <Link key={key} to={link} className={`${cls} transition-shadow hover:shadow-md`}>{content}</Link> : <div key={key} className={cls}>{content}</div>;
        })}
      </section>
      <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="font-['Outfit',Arial,sans-serif] text-xl font-semibold">Próximos pasos</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Noticias', 'Crear y editar noticias; en vista previa, los cambios son temporales.', routePaths.adminNews],
            ['02', 'Mensajes', 'Ver las consultas y su estado de atención.', routePaths.adminInbox],
            ['03', 'Medios', 'Conectar las imágenes cuando Django tenga Storage operativo.', null],
          ].map(([num, title, description, link]) => <div key={num} className="rounded-lg bg-[#f3f6fa] p-5"><span className="flex size-8 items-center justify-center rounded-full bg-[#ff6a1f] text-xs font-bold text-white">{num}</span><h4 className="mt-4 font-semibold">{title}</h4><p className="mt-2 text-sm leading-relaxed text-[#626b79]">{description}</p>{link && <Link to={link} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#b94308]">Abrir <ArrowRight size={15}/></Link>}</div>)}
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-[#626b79]"><Plus size={15}/> En vista previa los cambios no se guardan. La carga real de imágenes requiere el endpoint de Django.</p>
      </section>
    </div>
  );
}
