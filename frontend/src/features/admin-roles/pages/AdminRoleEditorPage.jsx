import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { hasAdminPermission } from '../../admin/utils/adminData.js';
import { PermissionMatrix } from '../components/PermissionMatrix.jsx';
import { RoleError, RoleLoading, UnsavedRoleDialog } from '../components/RoleStates.jsx';
import { rolesService } from '../services/rolesService.js';
import { isOwnRole, makeRolePayload, readPermissions, readRole, roleDraft, roleFieldErrors, roleHasChanges, roleRequestError } from '../utils/roles.js';

const inputClass = 'mt-2 w-full rounded-lg border border-[#dfe5ec] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304e7d]/30 disabled:bg-[#f3f6fa] disabled:text-[#626b79]';

export function AdminRoleEditorPage() {
  const { id } = useParams();
  const context = useOutletContext();
  return <RoleEditor key={`${id || 'new'}-${context.session?.user.id || 'preview'}`} id={id} context={context}/>;
}

function RoleEditor({ id, context }) {
  const { session, preview, refreshUser } = context;
  const token = session?.access;
  const canManage = !preview && hasAdminPermission(session?.user, 'roles.manage');
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState({ loading: true, role: null, catalog: [], error: '' });
  const [draft, setDraft] = useState(() => roleDraft());
  const [baseline, setBaseline] = useState(() => roleDraft());
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const inFlight = useRef(false);
  const errorSummary = useRef(null);
  const systemRole = resource.role?.name === 'Ingeniero';
  const dirty = canManage && !resource.loading && !created && roleHasChanges(draft, baseline, resource.role);
  const blocker = useBlocker(Boolean(dirty || busy));
  useBeforeUnload(useCallback((event) => {
    if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty, busy]));

  useEffect(() => { document.title = `${id ? 'Editar rol' : 'Crear rol'} | Administración EnObra`; }, [id]);
  useEffect(() => {
    if (preview) return undefined;
    const controller = new AbortController();
    let active = true;
    setResource({ loading: true, role: null, catalog: [], error: '' });
    async function load() {
      try {
        const [permissions, role] = await Promise.all([
          rolesService.permissions(token, controller.signal).then(readPermissions),
          id ? rolesService.get(id, token, controller.signal).then(readRole) : null,
        ]);
        if (active) {
          setResource({ loading: false, role, catalog: permissions, error: '' });
          setDraft(roleDraft(role)); setBaseline(roleDraft(role));
        }
      } catch (error) {
        if (active) setResource({ loading: false, role: null, catalog: [], error: roleRequestError(error) });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [id, token, preview, revision]);

  function update(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSaveError(''); setNotice('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!canManage || inFlight.current || created) return;
    inFlight.current = true; setBusy(true); setSaveError(''); setErrors({}); setNotice('');
    try {
      const payload = makeRolePayload(draft, resource.role);
      const saved = readRole(await (id ? rolesService.update(id, payload, token) : rolesService.create(payload, token)));
      setDraft(roleDraft(saved)); setBaseline(roleDraft(saved));
      setResource((previous) => ({ ...previous, role: saved }));
      if (!id) setCreated(saved);
      setNotice(id ? 'Cambios guardados.' : `Rol creado: ${saved.name}.`);
      if (isOwnRole(session?.user, resource.role)) {
        try {
          await refreshUser();
        } catch {
          setNotice('El rol se guardó, pero no se pudo actualizar tu sesión. Vuelve a iniciar sesión para actualizar el menú.');
        }
      }
    } catch (error) {
      setErrors(roleFieldErrors(error)); setSaveError(roleRequestError(error));
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      inFlight.current = false; setBusy(false);
    }
  }

  return <section>
    <Link to={routePaths.adminRoles} className="inline-flex items-center gap-2 text-sm font-semibold text-[#304e7d] hover:underline"><ArrowLeft size={16}/> Volver a roles</Link>
    <div className="mt-4"><p className="text-sm text-[#626b79]">Administración de accesos</p>
      <h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">{id ? (canManage ? 'Editar rol' : 'Consultar rol') : 'Crear rol'}</h2>
      <p className="mt-2 text-sm text-[#626b79]">{resource.role?.name || 'Configura el nombre, el estado y los permisos del rol.'}</p></div>
    {preview ? <p role="status" className="mt-6 rounded-lg bg-[#fff1e5] p-5 text-sm text-[#88420d]">Inicia sesión con una cuenta autorizada para consultar y modificar los roles reales.</p> : resource.loading ? <RoleLoading/> : resource.error ? <RoleError message={resource.error} retry={() => setRevision((value) => value + 1)}/> : <>
      {notice && <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-[#bce0ce] bg-[#eaf6ef] p-4 text-sm text-[#1f704a]">{notice}</p>}
      {created ? <Link to={routePaths.adminRoleDetail.replace(':id', created.id)} className="mt-5 inline-block rounded-lg border border-[#dfe5ec] bg-white px-5 py-3 text-sm font-semibold text-[#304e7d]">Ver rol creado</Link> : <>
        {!canManage && <p role="status" className="mt-5 rounded-lg bg-[#edf2f8] p-4 text-sm text-[#304e7d]">Solo lectura. No tienes permiso para guardar cambios.</p>}
        {systemRole && <div className="mt-5 flex items-start gap-3 rounded-lg bg-[#edf2f8] p-4 text-sm text-[#304e7d]"><ShieldCheck size={22} className="shrink-0"/><p><strong>Rol del sistema.</strong> El nombre, el estado y los permisos de Ingeniero están protegidos. Puedes actualizar su descripción.</p></div>}
        <form onSubmit={submit} className="mt-6 space-y-6">
          {saveError && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-[#f1cccc] bg-[#fff4f4] p-4 text-sm text-[#a62b2b]">{saveError}</div>}
          <fieldset disabled={!canManage || busy} className="rounded-xl border border-[#dfe5ec] bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-semibold">Datos del rol</legend>
            <div className="grid gap-5 sm:grid-cols-2"><div>
              <label htmlFor="role-name" className="text-sm font-semibold">Nombre</label>
              <input id="role-name" required maxLength={60} value={draft.name} disabled={systemRole} onChange={(event) => update('name', event.target.value)} className={inputClass} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'role-name-error' : undefined}/>
              {errors.name && <p id="role-name-error" className="mt-2 text-xs text-[#a62b2b]">{errors.name}</p>}
            </div><div className="self-center"><label className="inline-flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.active} disabled={systemRole} onChange={(event) => update('active', event.target.checked)} className="size-4 accent-[#304e7d]" aria-invalid={Boolean(errors.active)} aria-describedby={errors.active ? 'role-active-error' : undefined}/> Rol activo</label>
              <p className="mt-2 text-xs text-[#626b79]">Un rol inactivo no otorga acceso al panel.</p>{errors.active && <p id="role-active-error" className="mt-2 text-xs text-[#a62b2b]">{errors.active}</p>}</div>
              <div className="sm:col-span-2"><label htmlFor="role-description" className="text-sm font-semibold">Descripción <span className="font-normal text-[#626b79]">(opcional)</span></label>
                <textarea id="role-description" rows={3} maxLength={250} value={draft.description} onChange={(event) => update('description', event.target.value)} className={inputClass} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'role-description-error' : undefined}/>
                {errors.description && <p id="role-description-error" className="mt-2 text-xs text-[#a62b2b]">{errors.description}</p>}</div>
            </div>
          </fieldset>
          <PermissionMatrix catalog={resource.catalog} selected={draft.permissions} disabled={!canManage || systemRole || busy} onChange={(value) => update('permissions', value)} error={errors.permissions}/>
          <div className="flex flex-wrap items-center justify-end gap-4 border-t border-[#dfe5ec] pt-5">
            {dirty && <p role="status" className="mr-auto text-sm text-[#88420d]">Tienes cambios sin guardar.</p>}
            <Link to={routePaths.adminRoles} className="rounded-lg border border-[#dfe5ec] bg-white px-5 py-3 text-sm font-semibold text-[#304e7d]">{canManage ? 'Cancelar' : 'Volver'}</Link>
            {canManage && <button type="submit" disabled={busy || (Boolean(id) && !dirty)} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308] disabled:cursor-not-allowed disabled:opacity-50"><Save size={17}/>{busy ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear rol'}</button>}
          </div>
        </form>
      </>}
    </>}
    {blocker.state === 'blocked' && <UnsavedRoleDialog blocker={blocker} busy={busy}/>}
  </section>;
}
