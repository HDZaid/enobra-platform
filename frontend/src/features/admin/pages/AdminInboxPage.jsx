import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Mail, MessageSquareText, Search, ShieldCheck } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { inquiriesService } from '../services/inquiriesService.js';
import { adminActions, inquiryStatuses, readAdminCollection } from '../utils/adminData.js';
import { advancePreviewInquiry, filterInquiries, formatInquiryDate, INBOX_PAGE_SIZE, nextInquiryStatus, normalizeInquiry, paginateInquiries } from '../utils/inbox.js';

const kinds = { contacto: 'Contacto', visita: 'Solicitud de visita' };
const statusClass = {
  nuevo: 'bg-[#fff1e5] text-[#88420d]',
  atendido: 'bg-[#e6f4ec] text-[#1f7a4d]',
  archivado: 'bg-[#edf0f4] text-[#626b79]',
};

function errorText(error, operation) {
  if (error?.status === 401 || error?.status === 403) return 'Tu sesión no tiene permisos para gestionar estas solicitudes.';
  if (error?.status === 501) return 'Esta operación todavía no está disponible en Django.';
  if (error?.status === 400) return 'Django rechazó el cambio de estado. Actualiza la bandeja y vuelve a intentarlo.';
  return `No se pudo ${operation}. Comprueba la conexión con Django.`;
}

export function AdminInboxPage() {
  const { session, preview, previewInquiries, setPreviewInquiries } = useOutletContext();
  const { manageInquiries } = adminActions(session?.user, preview);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [data, setData] = useState({ items: [], count: 0, loading: true, error: '', page: null, kind: '', status: '' });

  useEffect(() => {
    document.title = 'Solicitudes recibidas | EnObra';
    if (preview) return undefined;
    let active = true;
    async function load() {
      try {
        const params = { page, page_size: INBOX_PAGE_SIZE };
        if (kind) params.kind = kind;
        if (status) params.status = status;
        const response = await inquiriesService.list(params, session.access);
        const collection = readAdminCollection(response);
        const items = collection.items.map(normalizeInquiry);
        if (active) {
          setData({ items, count: collection.count, loading: false, error: '', page, kind, status });
          const lastPage = Math.max(1, Math.ceil(collection.count / INBOX_PAGE_SIZE));
          if (page > lastPage) setPage(lastPage);
        }
      } catch (error) {
        if (active) setData({ items: [], count: 0, loading: false, error: errorText(error, 'consultar las solicitudes'), page, kind, status });
      }
    }
    void load();
    return () => { active = false; };
  }, [session, preview, kind, status, page, refresh]);

  const filteredPreview = useMemo(() => filterInquiries(previewInquiries, { kind, status, query: search }), [previewInquiries, kind, status, search]);
  // Django solo admite filtros kind/status. La búsqueda en sesión real se aplica a la página recibida.
  const remoteItems = useMemo(() => filterInquiries(data.items, { query: search }), [data.items, search]);
  const items = preview ? paginateInquiries(filteredPreview, page) : remoteItems;
  const count = preview ? filteredPreview.length : data.count;
  const totalPages = Math.max(1, Math.ceil(count / INBOX_PAGE_SIZE));
  const loading = !preview && (data.loading || data.page !== page || data.kind !== kind || data.status !== status);

  function changeFilters(setter, value) {
    setter(value);
    setPage(1);
    setExpandedId(null);
    setNotice('');
    if (!preview) setData((previous) => ({ ...previous, loading: true }));
  }

  function clearFilters() {
    setKind(''); setStatus(''); setSearch(''); setPage(1); setExpandedId(null); setNotice('');
    if (!preview) setData((previous) => ({ ...previous, loading: true }));
  }

  function reload() {
    if (preview) return;
    setData((previous) => ({ ...previous, loading: true }));
    setRefresh((current) => current + 1);
  }

  async function advanceStatus(item) {
    const next = nextInquiryStatus(item.status);
    if (!manageInquiries || !next || savingId) return;
    setNotice('');
    if (preview) {
      setPreviewInquiries((current) => advancePreviewInquiry(current, item.id));
      setNotice('Estado actualizado solo en la demostración; no se envió ningún cambio a Django.');
      if (status) setPage(1);
      return;
    }
    setSavingId(item.id);
    try {
      const response = await inquiriesService.updateStatus(item.id, next, session.access);
      const updated = normalizeInquiry(response);
      setData((previous) => ({ ...previous, items: previous.items.map((entry) => entry.id === item.id ? updated : entry) }));
      setNotice('Estado actualizado correctamente en Django.');
      if (status) reload();
    } catch (error) {
      setNotice(errorText(error, 'actualizar el estado'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#626b79]">Comunicación</p>
          <h2 className="mt-1 font-['Outfit',Arial,sans-serif] text-[30px] font-semibold">Solicitudes recibidas</h2>
          <p className="mt-2 max-w-[670px] text-sm leading-relaxed text-[#626b79]">Consultas de Contacto y solicitudes de visitas. Revisa los detalles y da seguimiento a cada mensaje.</p>
        </div>
        {!preview && <button type="button" onClick={reload} className="rounded-lg border border-[#dfe5ec] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f3f6fa]">Actualizar bandeja</button>}
      </div>

      {preview && <p role="status" className="mt-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm text-[#88420d]">Datos ficticios para probar el panel. Los cambios de estado son temporales y se perderán al recargar la página. No hay mensajes reales ni comunicación con Django.</p>}
      {notice && <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-[#dfe5ec] bg-white p-4 text-sm">{notice}</p>}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4">
          <div className="flex items-center gap-2"><Mail size={20} className="text-[#304e7d]" aria-hidden="true"/><h3 className="font-semibold">Bandeja ({loading ? '…' : count})</h3></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626b79]" aria-hidden="true"/><span className="sr-only">Buscar solicitudes</span><input type="search" value={search} onChange={(event) => changeFilters(setSearch, event.target.value)} placeholder="Nombre, asunto o correo" className="w-48 rounded-lg border border-[#dfe5ec] py-2 pl-9 pr-3 text-xs sm:w-56"/></label>
            <label><span className="sr-only">Filtrar por tipo</span><select value={kind} onChange={(event) => changeFilters(setKind, event.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Todos los tipos</option><option value="contacto">Contacto</option><option value="visita">Visitas</option></select></label>
            <label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => changeFilters(setStatus, event.target.value)} className="rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-xs"><option value="">Todos los estados</option>{Object.entries(inquiryStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
        </div>
        {!preview && search.trim() && <p className="border-b border-[#dfe5ec] bg-[#f8fafc] px-5 py-3 text-xs text-[#626b79]">La búsqueda se aplica únicamente a la página cargada. Django todavía no ofrece un filtro de búsqueda global para solicitudes.</p>}
        {loading ? <p role="status" className="p-6 text-sm text-[#626b79]">Cargando solicitudes…</p>
          : !preview && data.error ? <div role="alert" className="p-6 text-sm text-[#9c2929]"><p>{data.error}</p><button type="button" onClick={reload} className="mt-3 rounded-lg border border-[#dfe5ec] px-4 py-2 text-xs font-semibold text-[#304e7d]">Reintentar consulta</button></div>
            : items.length === 0 ? <div className="px-5 py-14 text-center"><Mail size={34} className="mx-auto text-[#626b79]" aria-hidden="true"/><p className="mt-3 font-semibold">No hay solicitudes que coincidan</p><p className="mt-1 text-sm text-[#626b79]">Prueba otros filtros o revisa otra página.</p><button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-[#b94308] underline">Limpiar filtros</button></div>
              : <div className="divide-y divide-[#dfe5ec]">{items.map((item) => {
                const expanded = expandedId === item.id;
                const next = nextInquiryStatus(item.status);
                return <article key={item.id} className="px-5 py-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3f6fa] text-[#304e7d]"><MessageSquareText size={19} aria-hidden="true"/></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{item.name}</h4><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[item.status]}`}>{inquiryStatuses[item.status]}</span>{preview && <span className="text-[11px] text-[#88420d]">Referencia</span>}</div>
                      <p className="mt-1 text-xs text-[#626b79]">{kinds[item.kind]} · {formatInquiryDate(item.created_at)}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#626b79]">{item.subject || item.property_title || item.message || 'Sin asunto'}{item.subject && item.message ? ` · ${item.message}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" aria-expanded={expanded} aria-controls={`inquiry-detail-${item.id}`} onClick={() => setExpandedId(expanded ? null : item.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe5ec] px-3 py-2 text-xs font-semibold hover:bg-[#f3f6fa]">{expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} {expanded ? 'Ocultar' : 'Ver detalle'}</button>
                      {manageInquiries && next && <button type="button" disabled={savingId !== null} onClick={() => { void advanceStatus(item); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#304e7d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12233f] disabled:opacity-50"><ShieldCheck size={15}/>{savingId === item.id ? 'Guardando…' : next === 'atendido' ? 'Marcar atendido' : 'Archivar'}</button>}
                    </div>
                  </div>
                  {expanded && <div id={`inquiry-detail-${item.id}`} className="mt-4 rounded-lg border border-[#dfe5ec] bg-[#f8fafc] p-4 text-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><p className="text-xs font-semibold text-[#626b79]">Correo</p>{item.email ? <a href={`mailto:${item.email}`} className="break-all text-[#b94308] underline-offset-2 hover:underline">{item.email}</a> : <p>No proporcionado</p>}</div>
                      <div><p className="text-xs font-semibold text-[#626b79]">Teléfono</p><p>{item.phone || 'No proporcionado'}</p></div>
                      {item.subject && <div><p className="text-xs font-semibold text-[#626b79]">Asunto</p><p>{item.subject}</p></div>}
                      {item.property_title && <div><p className="text-xs font-semibold text-[#626b79]">Propiedad</p><p>{item.property_title}{item.property_id != null ? ` (ID ${item.property_id})` : ''}</p></div>}
                      {item.preferred_date && <div><p className="text-xs font-semibold text-[#626b79]">Fecha de visita solicitada</p><p>{formatInquiryDate(item.preferred_date, true)}</p></div>}
                      <div><p className="text-xs font-semibold text-[#626b79]">Última actualización</p><p>{formatInquiryDate(item.updated_at)}</p></div>
                    </div>
                    <div className="mt-4 border-t border-[#dfe5ec] pt-4"><p className="text-xs font-semibold text-[#626b79]">Mensaje</p><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{item.message || 'Sin mensaje adicional.'}</p></div>
                    {item.updated_by && <p className="mt-3 flex items-center gap-1.5 text-xs text-[#626b79]"><Clock3 size={14} aria-hidden="true"/>Actualizado por: {item.updated_by}</p>}
                  </div>}
                </article>;
              })}</div>}
      </div>
      {!loading && (!data.error || preview) && <p className="mt-3 text-right text-xs text-[#626b79]">{preview ? `Mostrando ${items.length} de ${count} referencias` : `Mostrando ${items.length} de ${count} solicitudes (búsqueda local a esta página)`}</p>}
      {!loading && (!data.error || preview) && totalPages > 1 && <nav aria-label="Paginación de solicitudes" className="mt-5 flex items-center justify-end gap-3"><button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => { if (!preview) setData((previous) => ({ ...previous, loading: true })); setExpandedId(null); setPage((current) => current - 1); }} className="rounded-lg border border-[#dfe5ec] bg-white p-2 disabled:opacity-40"><ChevronLeft size={18}/></button><span className="text-sm">Página {page} de {totalPages}</span><button type="button" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => { if (!preview) setData((previous) => ({ ...previous, loading: true })); setExpandedId(null); setPage((current) => current + 1); }} className="rounded-lg border border-[#dfe5ec] bg-white p-2 disabled:opacity-40"><ChevronRight size={18}/></button></nav>}
    </section>
  );
}
