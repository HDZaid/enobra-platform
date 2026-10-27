import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { usersService } from '../services/usersService.js';
import { hasAdminPermission, readAdminCollection } from '../utils/adminData.js';
import { previewUserRoles, previewUsers, readManagedUser, readUserRoles, userRequestError } from '../utils/users.js';
import { AdminUserEditor } from '../components/AdminUserEditor.jsx';
import { AdminUserEditDialog } from '../components/AdminUserEditDialog.jsx';

const formatDate = (value) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(value));

export function AdminUsersPage() {
  const { session, preview, refreshUser } = useOutletContext();
  const token = session?.access;
  const canManage = !preview && hasAdminPermission(session?.user, 'users.manage');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], count: 0, error: '' });
  const [roleState, setRoleState] = useState({ loading: true, items: [], error: '' });
  const [examples, setExamples] = useState(() => [...previewUsers]);
  const [editing, setEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { document.title = 'Usuarios | Administración EnObra'; }, []);

  useEffect(() => {
    if (preview) return undefined;
    const controller = new AbortController();
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    async function load() {
      try {
        const result = readAdminCollection(await usersService.list({ q: query, page }, token, controller.signal));
        const items = result.items.map(readManagedUser);
        if (active) setState({ loading: false, items, count: result.count, error: '' });
      } catch (error) {
        if (active) setState({ loading: false, items: [], count: 0, error: userRequestError(error) });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [token, preview, query, page, revision]);

  useEffect(() => {
    if (preview || !canManage) return undefined;
    const controller = new AbortController();
    let active = true;
    setRoleState({ loading: true, items: [], error: '' });
    async function load() {
      try {
        const items = readUserRoles(await usersService.roles(token, controller.signal));
        if (active) setRoleState({ loading: false, items, error: '' });
      } catch (error) {
        if (active) setRoleState({ loading: false, items: [], error: userRequestError(error) });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [token, preview, revision, canManage]);

  async function userSaved(saved) {
    setState((previous) => ({ ...previous, items: previous.items.map((item) => item.id === saved.id ? saved : item) }));
    if (saved.id === session?.user.id) {
      try { await refreshUser(); }
      catch { return 'Los cambios se guardaron, pero no se pudo actualizar tu sesión. Vuelve a iniciar sesión para ver tu nombre actualizado.'; }
    }
    return '';
  }

  async function createUser(payload) {
    let created;
    if (preview) {
      const role = previewUserRoles.find((item) => item.id === payload.role_id);
      created = { id: `preview-${crypto.randomUUID()}`, name: payload.name, email: payload.email,
        active: payload.active, roles: [{ id: role.id, name: role.name }], created_at: new Date().toISOString() };
      if (examples.some((item) => item.email.toLowerCase() === created.email)) {
        throw { status: 400, message: 'Revisa el correo de la cuenta de referencia.', details: { email: ['Este correo ya está en la demostración.'] } };
      }
      setExamples((previous) => [created, ...previous]);
    } else {
      created = readManagedUser(await usersService.create(payload, token));
    }
    setEditing(false);
    setNotice(preview ? `Referencia creado: ${created.name}. No es una cuenta real.` : `Usuario creado: ${created.name}. ${created.active ? 'La cuenta ya puede iniciar sesión.' : 'La cuenta está inactiva.'}`);
    setPage(1);
    setSearch('');
    setQuery('');
    if (!preview) setRevision((value) => value + 1);
  }

  const filtered = examples.filter((item) => `${item.name} ${item.email}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  const items = preview ? filtered.slice((page - 1) * 12, page * 12) : state.items;
  const count = preview ? filtered.length : state.count;
  const loading = !preview && state.loading;
  const error = !preview && state.error;
  const roles = preview ? previewUserRoles : roleState.items;
  const canCreate = preview || (canManage && !roleState.loading && !roleState.error && roles.length > 0);
  const pages = Math.max(1, Math.ceil(count / 12));

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm text-[#626b79]">Administración de accesos</p><h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Usuarios del panel</h2>
        <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-[#626b79]">Crea las cuentas de tu equipo y asigna el rol que corresponde a cada persona.</p></div>
      {(preview || canManage) && <button type="button" disabled={!canCreate} onClick={() => { setEditing(true); setNotice(''); }} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308] disabled:cursor-not-allowed disabled:opacity-50"><UserPlus size={18}/> Añadir usuario</button>}
    </div>
    {preview && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm text-[#88420d]">Usuarios de demostración. Las cuentas creadas aquí solo existen en esta vista y no pueden iniciar sesión.</p>}
    {!preview && !canManage && <p role="status" className="mt-5 rounded-lg bg-[#edf2f8] p-4 text-sm text-[#304e7d]">Solo lectura. No tienes permiso para crear o editar usuarios.</p>}
    {notice && <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-[#bce0ce] bg-[#eaf6ef] p-4 text-sm text-[#1f704a]">{notice}</p>}
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#dfe5ec] bg-white px-5 py-4">
      <span className="rounded-lg bg-[#edf2f8] p-2 text-[#304e7d]"><ShieldCheck size={21}/></span>
      <div><h3 className="text-sm font-semibold">Cada persona, el acceso que necesita</h3><p className="mt-1 text-xs leading-relaxed text-[#626b79]">Solo un administrador puede crear cuentas. El rol asignado define las opciones del panel; una cuenta inactiva no puede ingresar.</p></div>
    </div>
    {!preview && roleState.error && <div role="alert" className="mt-5 rounded-lg border border-[#f1cccc] bg-[#fff4f4] p-4 text-sm text-[#a62b2b]"><p>{roleState.error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 underline">Reintentar carga de roles</button></div>}
    {!preview && !roleState.loading && !roleState.error && roles.length === 0 && <p role="status" className="mt-5 rounded-lg bg-[#fff1e5] p-4 text-sm text-[#88420d]">No hay roles activos disponibles. Activa un rol antes de crear una cuenta.</p>}
    <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe5ec] px-5 py-4">
        <div className="flex items-center gap-2"><Users size={20} className="text-[#304e7d]"/><h3 className="font-semibold">Cuentas registradas <span className="ml-1 rounded-full bg-[#edf2f8] px-2 py-0.5 text-xs text-[#304e7d]">{loading || error ? '—' : count}</span></h3></div>
        <form role="search" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }} className="flex max-w-full flex-wrap items-center gap-2">
          <label className="relative min-w-0"><Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#626b79]"/><span className="sr-only">Buscar por nombre o correo</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o correo" maxLength={150} className="w-48 max-w-full rounded-lg border border-[#dfe5ec] py-2 pl-9 pr-3 text-sm sm:w-56"/></label>
          <button type="submit" className="rounded-lg border border-[#dfe5ec] px-3 py-2 text-sm font-semibold text-[#304e7d] hover:bg-[#f3f6fa]">Buscar</button>
          <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label="Actualizar usuarios" className="rounded-lg border border-[#dfe5ec] p-2.5 text-[#304e7d] hover:bg-[#f3f6fa]"><RefreshCw size={16}/></button>
        </form>
      </div>
      {loading ? <p role="status" className="p-8 text-sm text-[#626b79]">Cargando usuarios…</p> : error ? <div role="alert" className="p-8 text-sm text-[#a62b2b]"><p>{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-3 rounded-lg border border-[#dfe5ec] px-4 py-2 text-[#304e7d]">Reintentar consulta</button></div>
        : items.length === 0 ? <div className="px-6 py-12 text-center"><Users size={30} className="mx-auto text-[#8b9bb1]"/><h4 className="mt-3 font-semibold">{query ? 'No encontramos usuarios' : 'Aún no hay usuarios'}</h4><p className="mt-2 text-sm text-[#626b79]">{query ? 'Prueba con otro nombre o correo electrónico.' : 'Añade la primera cuenta para dar acceso a tu equipo.'}</p>{query && <button type="button" onClick={() => { setSearch(''); setQuery(''); setPage(1); }} className="mt-4 text-sm font-semibold text-[#b94308] underline">Limpiar búsqueda</button>}</div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm"><thead className="bg-[#f3f6fa] text-[11px] tracking-wide text-[#626b79] uppercase"><tr>{['Usuario', 'Rol asignado', 'Estado', 'Fecha de creación', ...(canManage ? ['Acciones'] : [])].map((label) => <th key={label} scope="col" className="px-5 py-4">{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[#dfe5ec]"><td className="px-5 py-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#edf2f8] font-semibold text-[#304e7d]">{item.name.slice(0, 1).toUpperCase()}</span><div><p className="max-w-64 truncate font-semibold" title={item.name}>{item.name}</p><p className="mt-1 max-w-64 truncate text-xs text-[#626b79]" title={item.email}>{item.email}</p></div></div></td><td className="px-5 py-5"><div className="flex flex-wrap gap-1.5">{item.roles.map((role) => <span key={role.id} className="rounded-md bg-[#edf2f8] px-2.5 py-1 text-xs font-medium text-[#304e7d]">{role.name}</span>)}{item.roles.length === 0 && <span className="text-xs text-[#626b79]">Sin rol</span>}</div></td><td className="px-5 py-5"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${item.active ? 'bg-[#e6f4ec] text-[#1f7a4d]' : 'bg-[#f3f6fa] text-[#626b79]'}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${item.active ? 'bg-[#1f7a4d]' : 'bg-[#8b929e]'}`}/>{item.active ? 'Activa' : 'Inactiva'}</span></td><td className="px-5 py-5 text-xs text-[#626b79]">{formatDate(item.created_at)}</td>{canManage && <td className="px-5 py-5"><button type="button" disabled={roleState.loading || Boolean(roleState.error)} aria-label={`Editar usuario ${item.name}`} onClick={() => { setSelectedUser(item); setNotice(''); }} className="rounded-lg border border-[#dfe5ec] px-3 py-2 text-sm font-semibold text-[#304e7d] disabled:opacity-50">Editar</button></td>}</tr>)}</tbody></table></div>}
    </div>
    {!loading && !error && pages > 1 && <nav aria-label="Paginación de usuarios" className="mt-5 flex items-center justify-end gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Página anterior" className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40"><ChevronLeft size={18}/></button><span className="text-sm">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} aria-label="Página siguiente" className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40"><ChevronRight size={18}/></button></nav>}
    {editing && <AdminUserEditor roles={roles} preview={preview} onClose={() => setEditing(false)} onCreate={createUser}/>}
    {selectedUser && canManage && <AdminUserEditDialog key={selectedUser.id} user={selectedUser} roles={roles} actor={session.user} token={token}
      onSaved={userSaved} onClose={() => { setSelectedUser(null); setRevision((value) => value + 1); }}/>}
  </section>;
}
