import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { routePaths } from '../../../app/routePaths.js';
import { PropertyEmpty, PropertyError, PropertyTableSkeleton } from '../components/PropertyListStates.jsx';
import { TrashPropertyDialog } from '../components/TrashPropertyDialog.jsx';
import { adminPropertiesService } from '../services/adminPropertiesService.js';
import { canCreateProperty, canEditProperty, canTogglePublished, trashBlockedReason } from '../utils/propertyPermissions.js';
import {
  describePropertyError, filterByStatus, formatPropertyDate, formatPropertyPrice,
  propertyStatusFilters, statusLabel, totalPages,
} from '../utils/propertyList.js';

// FE-12 (formulario de alta y edición) activa estos botones cuando sus rutas existan.
const PROPERTY_FORM_ENABLED = false;

const emptyFilters = { q: '', operation: '', type: '', zone: '' };
const buttonClass = 'rounded-md border border-[#dfe5ec] p-2 text-[#304e7d] hover:bg-[#f3f6fa] disabled:cursor-not-allowed disabled:opacity-40';

export function AdminPropertiesPage() {
  const { session, preview } = useOutletContext();
  const user = session?.user;
  const token = session?.access;
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [facets, setFacets] = useState({ zones: [], types: [], operations: [] });
  const [state, setState] = useState({ items: [], count: 0, loading: true, error: '' });
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [trashing, setTrashing] = useState(null);

  useEffect(() => { document.title = 'Bienes raíces | Administración EnObra'; }, []);

  // El texto se espera 350 ms antes de consultar para no pedir en cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => {
        if (current.q === search) return current;
        setState((s) => ({ ...s, loading: true }));
        return { ...current, q: search };
      });
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (preview) return undefined;
    const controller = new AbortController();
    adminPropertiesService.facets({ signal: controller.signal }).then(setFacets).catch(() => {});
    return () => controller.abort();
  }, [preview]);

  useEffect(() => {
    if (preview || !token) return undefined;
    const controller = new AbortController();
    adminPropertiesService.list({ ...filters, page }, token, { signal: controller.signal })
      .then((data) => setState({ items: data.results, count: data.count, loading: false, error: '' }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ items: [], count: 0, loading: false, error: describePropertyError(error, 'consultar las propiedades') });
      });
    return () => controller.abort();
  }, [filters, page, refresh, token, preview]);

  const items = useMemo(() => filterByStatus(state.items, status), [state.items, status]);
  const pages = totalPages(state.count);
  const hasFilters = Boolean(filters.q || filters.operation || filters.type || filters.zone || status !== 'all');

  function reload() { setState((current) => ({ ...current, loading: true })); setRefresh((n) => n + 1); }
  function changeFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); setState((s) => ({ ...s, loading: true })); }
  function clearFilters() { setSearch(''); setFilters(emptyFilters); setStatus('all'); setPage(1); setState((s) => ({ ...s, loading: true })); }
  function goTo(next) { setState((s) => ({ ...s, loading: true })); setPage(next); }

  async function togglePublished(item) {
    if (busyId !== null) return;
    setBusyId(item.id); setNotice('');
    try {
      await adminPropertiesService.setPublished(item.id, !item.published, token);
      setNotice(item.published ? 'La propiedad pasó a borrador.' : 'La propiedad se publicó correctamente.');
      reload();
    } catch (error) {
      setNotice(describePropertyError(error, item.published ? 'pasar la propiedad a borrador' : 'publicar la propiedad'));
    } finally { setBusyId(null); }
  }

  async function confirmTrash() {
    if (!trashing || busyId !== null) return;
    setBusyId(trashing.id); setNotice('');
    try {
      await adminPropertiesService.trash(trashing.id, token);
      setNotice('La propiedad se envió a la papelera.');
      setTrashing(null);
      if (page > 1 && state.items.length === 1) goTo(page - 1); else reload();
    } catch (error) {
      setNotice(describePropertyError(error, 'enviar la propiedad a la papelera'));
      setTrashing(null);
    } finally { setBusyId(null); }
  }

  const newButton = PROPERTY_FORM_ENABLED && canCreateProperty(user)
    ? <Link to={`${routePaths.adminProperties}/nuevo`} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#b94308]"><Plus size={18} aria-hidden="true" /> Nueva propiedad</Link>
    : null;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#626b79]">Contenido del sitio</p>
          <h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Bienes raíces</h2>
          <p className="mt-2 max-w-[640px] text-sm text-[#626b79]">Consulta las propiedades, publícalas o regrésalas a borrador y envíalas a la papelera.</p>
        </div>
        {newButton}
      </div>

      {preview && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm text-[#88420d]">La vista previa no incluye datos de bienes raíces. Inicia sesión con una cuenta real para ver el listado.</p>}
      {notice && <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-[#dfe5ec] bg-white p-4 text-sm">{notice}</p>}
      {status !== 'all' && <p className="mt-5 rounded-lg border border-[#dfe5ec] bg-[#f8fafc] px-4 py-3 text-xs text-[#626b79]">El filtro por estado se aplica solo a la página cargada. El total y la paginación corresponden a todos los resultados del servidor.</p>}

      {!preview && (
        <div className="mt-6 rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4">
            <h3 className="font-semibold">Propiedades ({state.loading ? '…' : state.count})</h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626b79]" aria-hidden="true" /><span className="sr-only">Buscar propiedades</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar propiedad" className="w-44 rounded-lg border border-[#dfe5ec] py-2 pl-9 pr-3 text-xs sm:w-56" /></label>
              <label><span className="sr-only">Operación</span><select value={filters.operation} onChange={(e) => changeFilter('operation', e.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Venta y alquiler</option>{facets.operations.map((v) => <option key={v}>{v}</option>)}</select></label>
              <label><span className="sr-only">Tipo</span><select value={filters.type} onChange={(e) => changeFilter('type', e.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Todos los tipos</option>{facets.types.map((v) => <option key={v}>{v}</option>)}</select></label>
              <label><span className="sr-only">Zona</span><select value={filters.zone} onChange={(e) => changeFilter('zone', e.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Todas las zonas</option>{facets.zones.map((v) => <option key={v}>{v}</option>)}</select></label>
              <label><span className="sr-only">Estado de publicación</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs">{propertyStatusFilters.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          </div>

          {state.loading ? <PropertyTableSkeleton />
            : state.error ? <PropertyError message={state.error} onRetry={reload} />
              : items.length === 0 ? <PropertyEmpty filtered={hasFilters} onClear={clearFilters} action={newButton} />
                : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full text-left text-sm">
                      <thead className="bg-[#f3f6fa] text-[11px] tracking-wide text-[#626b79] uppercase"><tr>
                        <th scope="col" className="px-5 py-4">Propiedad</th><th scope="col" className="px-5 py-4">Operación</th><th scope="col" className="px-5 py-4">Zona</th>
                        <th scope="col" className="px-5 py-4">Precio</th><th scope="col" className="px-5 py-4">Fecha</th><th scope="col" className="px-5 py-4">Estado</th><th scope="col" className="px-5 py-4">Acciones</th>
                      </tr></thead>
                      <tbody>{items.map((item) => {
                        const busy = busyId !== null;
                        const blocked = trashBlockedReason(user, item);
                        return (
                          <tr key={item.id} className="border-t border-[#dfe5ec]">
                            <td className="px-5 py-4"><div className="flex items-center gap-3">
                              {item.images[0] ? <img src={item.images[0]} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg bg-[#e6ebf2] object-cover" /> : <div className="size-16 shrink-0 rounded-lg bg-[#e6ebf2]" aria-hidden="true" />}
                              <div className="min-w-0"><p className="max-w-[260px] font-semibold">{item.title}</p><p className="text-xs text-[#626b79]">{item.type} · {item.location}</p></div>
                            </div></td>
                            <td className="px-5 py-4">{item.operation}</td>
                            <td className="px-5 py-4">{item.zone}</td>
                            <td className="px-5 py-4 whitespace-nowrap">{formatPropertyPrice(item)}</td>
                            <td className="px-5 py-4 whitespace-nowrap">{formatPropertyDate(item.date)}</td>
                            <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.demo ? 'bg-[#fff1e5] text-[#88420d]' : item.published ? 'bg-[#e6f4ec] text-[#1f7a4d]' : 'bg-[#f3f6fa] text-[#626b79]'}`}>{statusLabel(item)}</span></td>
                            <td className="px-5 py-4"><div className="flex gap-2">
                              {item.published && <Link to={routePaths.propertyDetail.replace(':id', String(item.id))} target="_blank" rel="noopener noreferrer" aria-label={`Ver en el sitio ${item.title}`} title="Ver en el sitio" className={buttonClass}><Eye size={16} aria-hidden="true" /></Link>}
                              {PROPERTY_FORM_ENABLED && canEditProperty(user, item) && <Link to={`${routePaths.adminProperties}/${item.id}/editar`} aria-label={`Editar ${item.title}`} title="Editar" className={buttonClass}><Pencil size={16} aria-hidden="true" /></Link>}
                              {canTogglePublished(user, item) && <button type="button" disabled={busy} onClick={() => { void togglePublished(item); }} aria-label={item.published ? `Pasar a borrador ${item.title}` : `Publicar ${item.title}`} title={item.published ? 'Pasar a borrador' : 'Publicar'} className={buttonClass}>{item.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>}
                              <button type="button" disabled={busy || Boolean(blocked)} onClick={() => { setTrashing(item); setNotice(''); }} aria-label={`Enviar a la papelera ${item.title}`} title={blocked || 'Enviar a la papelera'} className={`${buttonClass} !text-[#a62b2b] hover:!bg-[#fdeaea]`}><Trash2 size={16} aria-hidden="true" /></button>
                            </div></td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
        </div>
      )}

      {!preview && !state.loading && !state.error && pages > 1 && (
        <nav aria-label="Paginación" className="mt-5 flex items-center justify-end gap-3">
          <button type="button" disabled={page <= 1} onClick={() => goTo(page - 1)} className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={18} /></button>
          <span className="text-sm">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => goTo(page + 1)} className="rounded-lg border border-[#dfe5ec] p-2 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={18} /></button>
        </nav>
      )}

      <TrashPropertyDialog item={trashing} busy={busyId !== null} onCancel={() => setTrashing(null)} onConfirm={() => { void confirmTrash(); }} />
    </section>
  );
}
