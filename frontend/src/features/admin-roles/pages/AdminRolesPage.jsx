import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { hasAdminPermission } from '../../admin/utils/adminData.js';
import { RoleError, RoleLoading } from '../components/RoleStates.jsx';
import { rolesService } from '../services/rolesService.js';
import { readRoles, roleRequestError } from '../utils/roles.js';

export function AdminRolesPage() {
  const { session, preview } = useOutletContext();
  const token = session?.access;
  const canManage = !preview && hasAdminPermission(session?.user, 'roles.manage');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], error: '' });
  useEffect(() => { document.title = 'Roles y permisos | Administración EnObra'; }, []);
  useEffect(() => {
    if (preview) return undefined;
    const controller = new AbortController();
    let active = true;
    setState({ loading: true, items: [], error: '' });
    rolesService.list(token, controller.signal).then(readRoles).then((items) => {
      if (active) setState({ loading: false, items, error: '' });
    }).catch((error) => {
      if (active) setState({ loading: false, items: [], error: roleRequestError(error) });
    });
    return () => { active = false; controller.abort(); };
  }, [token, preview, revision]);
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm text-[#626b79]">Administración de accesos</p>
        <h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Roles y permisos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#626b79]">Define qué puede hacer cada persona del equipo con permisos organizados por módulo.</p></div>
      {canManage && <Link to={routePaths.adminRoleNew} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308]"><Plus size={18}/> Crear rol</Link>}
    </div>
    {preview ? <p role="status" className="mt-6 rounded-xl border border-[#f4cfae] bg-[#fff1e5] p-5 text-sm text-[#88420d]">Inicia sesión con una cuenta autorizada para consultar y administrar los roles reales. La vista previa no crea ni modifica roles.</p> : <>
      {!canManage && <p role="status" className="mt-5 rounded-lg bg-[#edf2f8] p-4 text-sm text-[#304e7d]">Solo lectura. Tu cuenta puede consultar los roles, pero no modificarlos.</p>}
      {state.loading ? <RoleLoading/> : state.error ? <RoleError message={state.error} retry={() => setRevision((value) => value + 1)}/> :
        <div className="mt-6 overflow-hidden rounded-xl border border-[#dfe5ec] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4"><h3 className="font-semibold">Roles registrados <span className="ml-1 text-sm font-normal text-[#626b79]">({state.items.length})</span></h3>
            <button type="button" aria-label="Actualizar roles" onClick={() => setRevision((value) => value + 1)} className="rounded-lg border border-[#dfe5ec] p-2 text-[#304e7d]"><RefreshCw size={17}/></button></div>
          {!state.items.length ? <div className="px-6 py-12 text-center"><ShieldCheck size={32} className="mx-auto text-[#8b9bb1]"/><h3 className="mt-3 font-semibold">Aún no hay roles</h3><p className="mt-2 text-sm text-[#626b79]">Los roles que cree tu equipo aparecerán aquí.</p></div> :
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#f3f6fa] text-xs text-[#626b79]"><tr>{['Rol', 'Estado', 'Permisos', 'Acciones'].map((label) => <th key={label} scope="col" className="px-5 py-4">{label}</th>)}</tr></thead>
              <tbody>{state.items.map((role) => <tr key={role.id} className="border-t border-[#dfe5ec]">
                <td className="max-w-md px-5 py-5"><p className="font-semibold">{role.name} {role.name === 'Ingeniero' && <span className="ml-2 inline-block rounded-md bg-[#edf2f8] px-2 py-1 text-[10px] text-[#304e7d]">Rol del sistema</span>}</p><p className="mt-1 break-words text-xs leading-relaxed text-[#626b79]">{role.description || 'Sin descripción'}</p></td>
                <td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${role.active ? 'bg-[#e6f4ec] text-[#1f7a4d]' : 'bg-[#f3f6fa] text-[#626b79]'}`}>{role.active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="px-5 py-5">{role.permissions.length}</td><td className="px-5 py-5"><Link to={routePaths.adminRoleDetail.replace(':id', role.id)} aria-label={`${canManage ? 'Editar' : 'Consultar'} rol ${role.name}`} className="inline-flex items-center gap-2 font-semibold text-[#304e7d] hover:underline">{canManage ? 'Editar' : 'Consultar'}<ArrowRight size={16}/></Link></td>
              </tr>)}</tbody></table></div>}
        </div>}
    </>}
  </section>;
}
