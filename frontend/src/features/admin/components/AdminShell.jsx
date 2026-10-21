import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, LayoutDashboard, LogOut, Mail, Menu, Newspaper, ShieldCheck, X } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { adminRoleProfile, canAccessAdminSection } from '../utils/adminData.js';
import '../styles/admin-fonts.css';

const navigation = [
  { label: 'Resumen', to: routePaths.admin, icon: LayoutDashboard, end: true, section: 'dashboard' },
  { label: 'Noticias', to: routePaths.adminNews, icon: Newspaper, section: 'news' },
  { label: 'Mensajes', to: routePaths.adminInbox, icon: Mail, section: 'inbox' },
];

const pageNames = {
  [routePaths.admin]: 'Resumen',
  [routePaths.adminNews]: 'Noticias',
  [routePaths.adminInbox]: 'Mensajes',
};

export function AdminShell({ children, user, preview, onLogout }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const name = user?.name || 'Vista previa';
  const profile = adminRoleProfile(user);
  // En la vista previa se muestran todas las secciones; en sesión real, solo las que autoriza Django.
  const visibleNavigation = navigation.filter(({ section }) => preview || canAccessAdminSection(user, section));
  const linkClass = ({ isActive }) => `flex w-full items-center gap-3 border-l-[3px] px-5 py-3 text-sm transition-colors ${isActive
    ? 'border-[#ff6a1f] bg-white/15 font-semibold text-white'
    : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-[#f3f6fa] font-['Inter',Arial,sans-serif] text-[#12233f]">
      {open && <button type="button" className="fixed inset-0 z-30 bg-[#12233f]/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-gradient-to-b from-[#12233f] to-[#304e7d] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Administración">
        <div className="border-b border-white/15 px-5 py-6">
          <Link to="/" className="font-['Outfit',Arial,sans-serif] text-[26px] font-bold" onClick={() => setOpen(false)}>En<span className="text-[#ff6a1f]">Obra</span></Link>
          <p className="mt-1 text-[10px] font-bold tracking-[.16em] text-white/70">CONSTRUYE</p>
          <span className="mt-3 inline-block rounded-full bg-[#ff6a1f] px-3 py-1 text-[10px] font-bold tracking-widest uppercase">{preview ? 'Demo' : profile.label}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-5" aria-label="Secciones del panel">
          <p className="mb-2 px-5 text-[10px] font-semibold tracking-[.17em] text-white/50 uppercase">Principal</p>
          {visibleNavigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
              <Icon size={19} aria-hidden="true" />{label}
            </NavLink>
          ))}
          <p className="mt-8 mb-2 px-5 text-[10px] font-semibold tracking-[.17em] text-white/50 uppercase">Sitio público</p>
          <Link to="/" className="flex items-center gap-3 px-5 py-3 text-sm text-white/70 hover:text-white" onClick={() => setOpen(false)}>
            <ArrowUpRight size={19} aria-hidden="true" /> Ver el sitio
          </Link>
        </nav>
        <div className="flex items-center gap-2 border-t border-white/15 px-4 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ff6a1f] font-semibold" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-white/60" title={preview ? undefined : profile.description}>{preview ? 'Solo demostración' : profile.label}</p></div>
          <button type="button" onClick={onLogout} className="rounded-md p-2 hover:bg-white/15" title={preview ? 'Salir de vista previa' : 'Cerrar sesión'} aria-label="Salir del panel"><LogOut size={19}/></button>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-[#dfe5ec] bg-white px-5 sm:px-8">
          <button type="button" className="rounded-md p-2 hover:bg-[#f3f6fa] lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[.16em] text-[#b94308] uppercase">Administración</p><h1 className="font-['Outfit',Arial,sans-serif] text-xl font-semibold">{pageNames[pathname] || 'Panel'}</h1></div>
          <ShieldCheck size={19} aria-hidden="true" className="hidden text-[#304e7d] sm:block" />
        </header>
        {preview && <div role="status" className="border-b border-[#f4cfae] bg-[#fff1e5] px-5 py-3 text-sm text-[#88420d] sm:px-8">Vista previa local: Noticias y Mensajes contienen datos de prueba. Los cambios solo existen en memoria y no se envían a Django.</div>}
        <div className="mx-auto w-full max-w-[1160px] px-5 py-7 sm:px-8 sm:py-9">{children}</div>
      </div>
    </div>
  );
}
