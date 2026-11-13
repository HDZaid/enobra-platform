import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, HousePlus, Mail, Newspaper, Building2, FolderPlus, Users } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { loadDashboardCounts } from '../utils/dashboard.js';
import { checkLanding, landingMessage } from '../utils/landingStatus.js';
import { canAccessAdminSection, displayAdminCount, hasAdminPermission } from '../utils/adminData.js';

const stats = [
  { label: 'Noticias', key: 'news', icon: Newspaper, link: routePaths.adminNews, section: 'news' },
  { label: 'Mensajes', key: 'messages', icon: Mail, link: routePaths.adminInbox, section: 'inbox' },
  { label: 'Proyectos', key: 'projects', icon: Building2, link: routePaths.adminProjects, section: 'projects' },
  { label: 'Propiedades', key: 'properties', icon: HousePlus, link: routePaths.adminProperties, section: 'properties' },
];

const shortcuts = [
  { title: 'Crear noticia', icon: Newspaper, link: { pathname: routePaths.adminNews, search: '?crear=1' }, permission: 'news.create' },
  { title: 'Crear proyecto', icon: FolderPlus, link: routePaths.adminProjectNew, permission: 'projects.create' },
  { title: 'Agregar propiedad', icon: HousePlus, link: routePaths.adminPropertyNew, permission: 'properties.create' },
  { title: 'Administrar usuarios', icon: Users, link: routePaths.adminUsers, permission: 'users.manage' },
  { title: 'Consultar usuarios', icon: Users, link: routePaths.adminUsers, permission: 'users.read', unless: 'users.manage' },
];

export function AdminDashboardPage() {
  const { session, preview, previewNews, previewInquiries } = useOutletContext();
  const [counts, setCounts] = useState({ news: null, messages: null });
  const [warning, setWarning] = useState('');
  const [landing, setLanding] = useState(null);
  const user = session?.user;
  const can = (section) => preview || canAccessAdminSection(user, section);
  const canCatalog = can('projects') || can('properties');

  // Advierte si el sitio público (copia estática del despliegue) no refleja lo publicado.
  useEffect(() => {
    if (preview || !canCatalog) return undefined;
    const controller = new AbortController();
    checkLanding({ signal: controller.signal }).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result.state === 'missing' && !import.meta.env.PROD) return;
        setLanding(result.state === 'ok' ? null : result);
      },
      () => undefined,
    );
    return () => controller.abort();
  }, [preview, canCatalog]);

  useEffect(() => {
    document.title = 'Resumen administrativo | EnObra';
    if (preview) return undefined;
    let active = true;
    async function load() {
      const { counts: nextCounts, unavailable } = await loadDashboardCounts(session.user, session.access);
      if (!active) return;
      setCounts(nextCounts);
      setWarning(unavailable ? 'No pudimos cargar todos los indicadores. Actualiza la página para volver a intentarlo.' : '');
    }
    void load();
    return () => { active = false; };
  }, [session, preview]);

  const values = preview ? { news: previewNews.length, messages: previewInquiries.length } : counts;
  const visibleStats = stats.filter(({ section }) => can(section));
  const visibleShortcuts = shortcuts.filter(({ permission, unless }) =>
    (preview || hasAdminPermission(user, permission)) && !(unless && (preview || hasAdminPermission(user, unless))));

  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-[#12233f] to-[#304e7d] p-6 text-white sm:p-8">
        <h2 className="font-['Montserrat',Arial,sans-serif] text-[clamp(25px,4vw,36px)] font-semibold leading-tight">Gestiona el sitio de EnObra</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/80">Consulta la actividad del sitio y accede a tus tareas frecuentes.</p>
      </section>
      {landing && <p role={landing.state === 'updating' ? 'status' : 'alert'} className={`mt-5 rounded-lg border px-4 py-3 text-sm ${landing.state === 'updating' ? 'border-[#cfd9e6] bg-[#eef3f9] text-[#304e7d]' : 'border-[#f4cfae] bg-[#fff1e5] text-[#88420d]'}`}>{landingMessage(landing)}</p>}
      {warning && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] px-4 py-3 text-sm text-[#88420d]">{warning}</p>}
      <section aria-label="Indicadores" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {visibleStats.map(({ key, label, icon: Icon, link }, index) => {
          const content = <><Icon size={23} className="text-[#304e7d]" aria-hidden="true"/><span className="mt-3 block font-['Montserrat',Arial,sans-serif] text-[30px] font-semibold">{displayAdminCount(values[key])}</span><span className="block text-xs text-[#626b79]">{label}</span></>;
          const cls = `rounded-xl border-l-4 bg-white p-5 text-left shadow-sm ${index % 2 ? 'border-[#ff6a1f]' : 'border-[#304e7d]'}`;
          return link ? <Link key={key} to={link} className={`${cls} transition-shadow hover:shadow-md`}>{content}</Link> : <div key={key} className={cls}>{content}</div>;
        })}
      </section>
      {visibleShortcuts.length > 0 && (
        <section aria-labelledby="admin-shortcuts" className="mt-6 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <h3 id="admin-shortcuts" className="font-['Montserrat',Arial,sans-serif] text-xl font-semibold">Accesos rápidos</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleShortcuts.map(({ title, icon: Icon, link }) => (
              <Link
                key={title}
                to={link}
                className="flex min-h-16 items-center gap-3 rounded-lg border border-[#dfe5ec] bg-[#f3f6fa] px-3 py-2.5 text-sm font-semibold transition-colors hover:border-[#b3c4d9] hover:bg-[#eaf1f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#304e7d]"
              >
                <span className="rounded-lg bg-white p-2 text-[#304e7d]"><Icon size={19} aria-hidden="true" /></span>
                <span className="flex-1">{title}</span>
                <ArrowRight size={17} className="shrink-0 text-[#304e7d]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
