import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { History } from 'lucide-react';
import { TableSkeleton } from '../../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Notice } from '../../../components/ui/Notice.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';
import { historyService } from '../services/historyService.js';
import { HistoryDetail } from '../components/HistoryDetail.jsx';
import { actionColor, actionLabel, emptyHistoryFilters, formatHistoryDate, historyActions, historyFilename, historyModules, historyPermissions, moduleLabel, previewHistoryPage, validateHistoryFilters } from '../utils/history.js';

export function AdminHistoryPage() {
  const { session, preview } = useOutletContext();
  const permissions = historyPermissions(session?.user);
  if (!preview && !permissions.read) return <Notice type="error">No tienes permiso para consultar el historial.</Notice>;
  return <HistoryContent key={preview ? 'preview' : `${session.user.id}:${session.access}:${permissions.users}:${permissions.export}`} token={session?.access} preview={preview} permissions={permissions} />;
}

function HistoryContent({ token, preview, permissions }) {
  const [draft, setDraft] = useState(emptyHistoryFilters);
  const [filters, setFilters] = useState(emptyHistoryFilters);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [validation, setValidation] = useState('');
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const exportRequest = useRef(null);
  const allowUser = preview || permissions.users;
  useEffect(() => { document.title = 'Historial | Administración EnObra'; return () => exportRequest.current?.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: null, data: null });
    const request = preview ? Promise.resolve(previewHistoryPage(filters, page)) : historyService.list(filters, { page, allowUser, token, signal: controller.signal });
    request.then((data) => {
      if (controller.signal.aborted) return;
      const last = Math.max(1, Math.ceil(data.count / data.page_size));
      if (page > last) { setPage(last); return; }
      setState({ loading: false, error: null, data });
    }).catch((error) => { if (!controller.signal.aborted) setState({ loading: false, error, data: null }); });
    return () => controller.abort();
  }, [filters, page, revision, preview, token, allowUser]);
  function apply(event) {
    event.preventDefault();
    const next = { ...draft, q: draft.q.trim(), user_id: allowUser ? draft.user_id : '' };
    const error = validateHistoryFilters(next);
    setValidation(error);
    if (error) return;
    setDetail(null); setFilters(next); setPage(1);
  }
  function clear() { setDraft(emptyHistoryFilters()); setFilters(emptyHistoryFilters()); setValidation(''); setPage(1); }
  async function exportCsv() {
    if (preview || !permissions.export || exportRequest.current) return;
    const controller = new AbortController();
    exportRequest.current = controller;
    setExporting(true); setExportError(null);
    try {
      const text = await historyService.exportCsv(filters, { allowUser, token, signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = historyFilename(); document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { if (!controller.signal.aborted) setExportError(error); }
    finally { exportRequest.current = null; if (!controller.signal.aborted) setExporting(false); }
  }
  const pages = state.data ? Math.max(1, Math.ceil(state.data.count / state.data.page_size)) : 1;
  const inputClass = 'mt-1 block w-full rounded-lg border border-[#dfe5ec] bg-white px-3 py-2 text-sm';
  function update(key, value) { setDraft((current) => ({ ...current, [key]: value })); }
  return <section className="space-y-5">
    <div><h2 className="text-3xl font-semibold text-[#12233f]">Historial</h2><p className="mt-2 text-sm text-[#626b79]">Consulta qué se hizo, quién lo hizo y cuándo. Fechas y horas en la zona local del navegador.</p></div>
    {preview && <Notice>Demostración: estos eventos son ficticios. No se consulta el servidor ni se exportan datos reales.</Notice>}
    <form onSubmit={apply} className="grid gap-4 rounded-xl border border-[#dfe5ec] bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Buscar registro o descripción<input type="search" value={draft.q} onChange={(e) => update('q', e.target.value)} className={inputClass} /></label>
      <label className="text-sm">Módulo<select value={draft.module} onChange={(e) => update('module', e.target.value)} className={inputClass}><option value="">Todos los módulos</option>{Object.entries(historyModules).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm">Acción<select value={draft.action} onChange={(e) => update('action', e.target.value)} className={inputClass}><option value="">Todas las acciones</option>{Object.entries(historyActions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm">Desde<input type="date" value={draft.date_from} onChange={(e) => update('date_from', e.target.value)} className={inputClass} /></label>
      <label className="text-sm">Hasta<input type="date" value={draft.date_to} onChange={(e) => update('date_to', e.target.value)} className={inputClass} /></label>
      {allowUser && <label className="text-sm">ID del usuario<input type="number" min="1" step="1" value={draft.user_id} onChange={(e) => update('user_id', e.target.value)} className={inputClass} /></label>}
      {validation && <p role="alert" className="text-sm text-[#a62b2b] sm:col-span-2 lg:col-span-3">{validation}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3"><LoadingButton type="submit">Aplicar filtros</LoadingButton><LoadingButton variant="outline" onClick={clear}>Limpiar filtros</LoadingButton></div>
    </form>
    {!preview && permissions.export && <div className="space-y-2"><LoadingButton loading={exporting} loadingText="Exportando…" variant="outline" onClick={exportCsv}>Exportar CSV</LoadingButton><p className="text-xs text-[#626b79]">Exporta los filtros aplicados, hasta 10 000 eventos. El rango de fechas se interpreta en horario de Guatemala.</p></div>}
    {exportError && <ErrorState error={exportError} action="exportar el historial" onRetry={exportCsv} />}
    <div className="rounded-xl border border-[#dfe5ec] bg-white">
      {state.loading ? <TableSkeleton columns={7} /> : state.error ? <ErrorState error={state.error} action="consultar el historial" onRetry={() => setRevision((value) => value + 1)} />
        : !state.data?.results.length ? <EmptyState icon={History} title="No hay eventos para mostrar" description="Prueba con otros filtros o consulta más tarde." action={{ label: 'Limpiar filtros', onClick: clear }} />
          : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f3f6fa] text-[#626b79]"><tr>{['Fecha y hora', 'Usuario', 'Módulo', 'Acción', 'Registro', 'Descripción', 'Detalle'].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
            <tbody>{state.data.results.map((item) => <tr key={item.id} className="border-t border-[#dfe5ec]">
              <td className="px-4 py-4">{formatHistoryDate(item.date)}</td><td className="px-4 py-4">{item.user.name}</td><td className="px-4 py-4">{moduleLabel(item.module)}</td>
              <td className="px-4 py-4"><span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${actionColor(item.action)}`}>{actionLabel(item.action)}</span></td>
              <td className="max-w-48 break-words px-4 py-4">{item.record_name || 'Sin nombre'}</td><td className="max-w-xs px-4 py-4"><p className="line-clamp-2 break-words">{item.description || 'Sin descripción'}</p></td>
              <td className="px-4 py-4"><LoadingButton variant="outline" aria-label={`Ver detalle del evento ${item.id}`} onClick={() => setDetail(item)}>Ver detalle</LoadingButton></td>
            </tr>)}</tbody>
          </table></div>}
    </div>
    {!state.loading && !state.error && pages > 1 && <nav aria-label="Paginación del historial" className="flex flex-wrap items-center justify-end gap-3"><LoadingButton variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</LoadingButton><span className="text-sm">Página {page} de {pages}</span><LoadingButton variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</LoadingButton></nav>}
    {detail && <HistoryDetail item={detail} onClose={() => setDetail(null)} />}
  </section>;
}
