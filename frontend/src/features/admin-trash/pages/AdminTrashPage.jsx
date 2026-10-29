import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Notice } from '../../../components/ui/Notice.jsx';
import { TableSkeleton } from '../../../components/ui/Skeleton.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';
import { describeApiError } from '../../../components/ui/apiErrors.js';
import { canViewTrash, formatTrashDate, ownsTrashOnly, trashActions, trashTypes } from '../utils/trash.js';
import { trashService } from '../services/trashService.js';

export function AdminTrashPage() {
  const { session, preview } = useOutletContext();
  const [selected, setSelected] = useState('properties');
  const [busy, setBusy] = useState(false);
  const available = trashTypes.filter(({ value }) => canViewTrash(session?.user, value));
  const type = available.some(({ value }) => value === selected) ? selected : available[0]?.value;
  useEffect(() => { document.title = 'Papelera | Administración EnObra'; }, []);
  return <section>
    <h2 className="text-3xl font-semibold text-[#12233f]">Papelera</h2>
    <p className="mt-2 text-sm text-[#626b79]">Restaura publicaciones o elimínalas definitivamente. Restaurar devuelve cada publicación a su estado anterior: publicada o borrador.</p>
    <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="note" aria-label="Plazo de conservación en papelera">
      <p className="font-semibold">Conserva lo que necesites antes de 90 días</p>
      <p className="mt-1">Las publicaciones que lleven más de 90 días en la papelera se eliminarán definitivamente. Restáuralas antes de ese plazo si quieres conservarlas.</p>
      <p className="mt-1">El plazo empieza cuando envías la publicación a la papelera. Si no tienes permiso para restaurarla, solicita ayuda a un administrador.</p>
    </div>
    {preview ? <div className="mt-5"><Notice>La papelera requiere iniciar sesión con una cuenta real. Esta vista previa no consulta ni modifica publicaciones.</Notice></div>
      : !type ? <div className="mt-5"><Notice type="error">No tienes permiso para consultar la papelera.</Notice></div>
        : <>
          <div role="tablist" aria-label="Tipo de publicación" className="my-6 flex flex-wrap gap-2">
            {available.map((tab) => <button key={tab.value} id={`trash-tab-${tab.value}`} role="tab" type="button"
              aria-selected={type === tab.value} aria-controls="trash-panel" tabIndex={type === tab.value ? 0 : -1} disabled={busy}
              onClick={() => setSelected(tab.value)} onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || busy) return;
                event.preventDefault();
                const index = available.findIndex((item) => item.value === type);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
                setSelected(available[next].value);
                document.getElementById(`trash-tab-${available[next].value}`)?.focus();
              }} className={`rounded-lg border px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${type === tab.value ? 'border-[#304e7d] bg-[#304e7d] text-white' : 'border-[#dfe5ec] bg-white text-[#304e7d]'}`}>{tab.label}</button>)}
          </div>
          <TrashPanel key={`${type}:${session.user.id}:${session.access}`} type={type} user={session.user} token={session.access} onBusyChange={setBusy} />
        </>}
  </section>;
}

function TrashPanel({ type, user, token, onBusyChange }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const actions = trashActions(user, type);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onBusyChange(false); }; }, [onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: null, data: null });
    trashService.list(type, page, token, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      const last = Math.max(1, Math.ceil(data.count / data.page_size));
      if (page > last) { setPage(last); return; }
      setState({ loading: false, error: null, data });
    }).catch((error) => { if (!controller.signal.aborted) setState({ loading: false, error, data: null }); });
    return () => controller.abort();
  }, [type, page, token, revision]);
  const pages = state.data ? Math.max(1, Math.ceil(state.data.count / state.data.page_size)) : 1;
  function reload() { setState((previous) => ({ ...previous, loading: true })); setRevision((value) => value + 1); }
  function choose(item, action) { setActionError(''); setNotice(''); setSelection({ item, action }); }
  async function confirm() {
    if (!selection || inFlight.current || !actions[selection.action]) return;
    inFlight.current = true;
    setBusy(true); onBusyChange(true); setActionError('');
    try {
      await trashService[selection.action](type, selection.item.id, token);
      if (!mounted.current) return;
      setSelection(null);
      setNotice(selection.action === 'restore' ? 'Publicación restaurada a su estado anterior.' : 'Publicación eliminada definitivamente.');
      reload();
    } catch (error) {
      if (mounted.current) setActionError(describeApiError(error, { action: selection.action === 'restore' ? 'restaurar la publicación' : 'eliminar la publicación' }));
    } finally {
      inFlight.current = false;
      if (mounted.current) { setBusy(false); onBusyChange(false); }
    }
  }
  return <div id="trash-panel" role="tabpanel" aria-labelledby={`trash-tab-${type}`}>
    {ownsTrashOnly(user, type) && <div className="mb-4"><Notice>Solo se muestran tus publicaciones en la papelera. Tu permiso no permite restaurar ni eliminar definitivamente.</Notice></div>}
    {notice && <div className="mb-4"><Notice type="success" onClose={() => setNotice('')}>{notice}</Notice></div>}
    <div className="rounded-xl border border-[#dfe5ec] bg-white">
      {state.loading ? <TableSkeleton rows={6} columns={6} /> : state.error ? <ErrorState error={state.error} onRetry={reload} action="consultar la papelera" />
        : !state.data?.results.length ? <EmptyState icon={Trash2} title="La papelera está vacía" description="Las publicaciones enviadas a la papelera aparecerán aquí." />
          : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f3f6fa] text-[#626b79]"><tr>{['Título', 'Tipo', 'Estado anterior', 'Fecha de envío', 'Enviado por', 'Acciones'].map((title) => <th key={title} scope="col" className="px-4 py-3">{title}</th>)}</tr></thead>
            <tbody>{state.data.results.map((item) => <tr key={item.id} className="border-t border-[#dfe5ec]">
              <th scope="row" className="max-w-xs break-words px-4 py-4 font-semibold">{item.title}</th>
              <td className="px-4 py-4">{type === 'properties' ? 'Bienes Raíces' : 'Proyecto'}</td>
              <td className="px-4 py-4">{item.was_published ? 'Publicada' : 'Borrador'}</td>
              <td className="px-4 py-4">{formatTrashDate(item.trashed_at)}</td>
              <td className="px-4 py-4">{item.trashed_by_name || 'Usuario no disponible'}</td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2">
                {actions.restore && <LoadingButton variant="outline" disabled={busy} aria-label={`Restaurar ${item.title}`} onClick={() => choose(item, 'restore')}>Restaurar</LoadingButton>}
                {actions.remove && <LoadingButton variant="danger" disabled={busy} aria-label={`Eliminar definitivamente ${item.title}`} onClick={() => choose(item, 'remove')}>Eliminar definitivamente</LoadingButton>}
                {!actions.restore && !actions.remove && <span className="text-[#626b79]">Solo lectura</span>}
              </div></td>
            </tr>)}</tbody>
          </table></div>}
    </div>
    {!state.loading && !state.error && pages > 1 && <nav aria-label="Paginación de papelera" className="mt-5 flex flex-wrap items-center justify-end gap-3">
      <LoadingButton variant="outline" disabled={busy || page <= 1} onClick={() => { setState((previous) => ({ ...previous, loading: true })); setPage(page - 1); }}>Anterior</LoadingButton>
      <span className="text-sm">Página {page} de {pages}</span>
      <LoadingButton variant="outline" disabled={busy || page >= pages} onClick={() => { setState((previous) => ({ ...previous, loading: true })); setPage(page + 1); }}>Siguiente</LoadingButton>
    </nav>}
    <ConfirmDialog key={selection ? `${selection.action}:${selection.item.id}` : 'closed'} open={Boolean(selection)}
      title={selection?.action === 'remove' ? 'Eliminar definitivamente' : 'Restaurar publicación'}
      description={<><span>{selection?.action === 'remove' ? `«${selection.item.title}» se eliminará definitivamente. Esta acción no se puede deshacer.` : `«${selection?.item.title}» volverá como ${selection?.item.was_published ? 'publicada y visible en el sitio' : 'borrador, sin mostrarse en el sitio'}.`}</span>{actionError && <span role="alert" className="mt-3 block text-[#a62b2b]">{actionError}</span>}</>}
      confirmLabel={selection?.action === 'remove' ? 'Eliminar definitivamente' : 'Restaurar'} destructive={selection?.action === 'remove'}
      requireText={selection?.action === 'remove' ? selection.item.title : undefined} busy={busy} onConfirm={confirm} onCancel={() => { if (!inFlight.current) setSelection(null); }} />
  </div>;
}
