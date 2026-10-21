import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { adminRoleProfile } from '../utils/adminData.js';

export function AdminAccessDenied({ user }) {
  const profile = adminRoleProfile(user);
  return (
    <section role="alert" className="mx-auto max-w-[560px] rounded-2xl bg-white p-8 text-center shadow-sm">
      <ShieldAlert size={36} className="mx-auto text-[#b94308]" aria-hidden="true" />
      <h2 className="mt-4 font-['Outfit',Arial,sans-serif] text-2xl font-semibold">Esta sección no está disponible para tu rol</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#626b79]">
        Tu rol actual es <strong className="text-[#12233f]">{profile.label}</strong> ({profile.description.toLocaleLowerCase('es')}).
        Django solo permite esta sección a cuentas con acceso administrativo completo.
        Si necesitas entrar, pide a un Ingeniero que revise los permisos de tu rol.
      </p>
      <Link to={routePaths.admin} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#dfe5ec] px-4 py-2.5 text-sm font-semibold text-[#304e7d] hover:bg-[#f3f6fa]"><ArrowLeft size={16} aria-hidden="true" /> Volver al resumen</Link>
    </section>
  );
}
