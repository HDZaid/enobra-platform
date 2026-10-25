import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { routePaths } from '../../../app/routePaths.js';
import { TableSkeleton } from '../../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Notice } from '../../../components/ui/Notice.jsx';
import { adminProjectsService } from '../services/adminProjectsService.js';
import { PROJECT_TRASH_ENABLED, canCreateProject, canEditProject, canTrashProject, canToggleProject, filterProjects, projectEditPath } from '../utils/projects.js';

export function AdminProjectsPage() {
  const { session, preview } = useOutletContext();
  const navigate = useNavigate();
  const user = session?.user;
  const token = session?.access;
  const [year, setYear] = useState('');
  const [years, setYears] = useState([]);
  const [yearError, setYearError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], count: 0, error: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState(null);
  const [trashing, setTrashing] = useState(null);
  useEffect(() => { document.title = 'Proyectos | Administración EnObra'; }, []);
  useEffect(() => {
    if (preview || !token) return;
    const controller = new AbortController();
    adminProjectsService.years(token, { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setYears(value); setYearError(null); }
    }).catch((error) => { if (!controller.signal.aborted) setYearError(error); });
    return () => controller.abort();
  }, [token, preview, refresh]);
  useEffect(() => {
    if (preview || !token) return;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    adminProjectsService.list({ page, year }, token, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      setState({ loading: false, items: data.results, count: data.count, error: null });
      const last = Math.max(1, Math.ceil(data.count / 12));
      if (page > last) setPage(last);
    }).catch((error) => { if (!controller.signal.aborted) setState({ loading: false, items: [], count: 0, error }); });
    return () => controller.abort();
  }, [token, preview, page, year, refresh]);
  async function act(item, trash = false) {
    if (busy || preview || (trash ? !PROJECT_TRASH_ENABLED || !canTrashProject(user, item) : !canToggleProject(user, item))) return;
    setBusy(true); setActionError(null); setNotice('');
    try {
      if (trash) await adminProjectsService.trash(item.id, token);
      else await adminProjectsService.setPublished(item.id, !item.published, token);
      setNotice(trash ? 'Proyecto enviado a papelera.' : 'Estado de publicación actualizado.');
      setTrashing(null); setRefresh((value) => value + 1);
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  }
  const items = filterProjects(state.items, query);
  if (preview) return <Notice type="info">Proyectos requiere una sesión real. La vista previa no crea ni modifica publicaciones.</Notice>;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold">Proyectos</h2>{canCreateProject(user) && <Link className="rounded-lg bg-[#304e7d] px-4 py-2 text-white" to={routePaths.adminProjectNew}>Nuevo proyecto</Link>}</div>
    <div className="flex flex-wrap gap-4"><label className="text-sm">Buscar en esta página<input type="search" className="ml-2 rounded border p-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="text-sm">Año<select className="ml-2 rounded border p-2" value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}><option value="">Todos</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {query && <Notice type="info">La búsqueda se aplica únicamente a la página cargada. El total y la paginación corresponden al filtro de año.</Notice>}
    {yearError && <ErrorState error={yearError} action="consultar los años" onRetry={() => setRefresh((value) => value + 1)} />}
    {!PROJECT_TRASH_ENABLED && <Notice type="info">Enviar a papelera se habilitará al verificar el backend integrado. No se permite el borrado definitivo desde esta pantalla.</Notice>}
    {notice && <Notice type="success">{notice}</Notice>}{actionError && <ErrorState error={actionError} />}
    {state.loading ? <TableSkeleton columns={6} /> : state.error ? <ErrorState error={state.error} action="consultar proyectos" onRetry={() => setRefresh((value) => value + 1)} /> : !items.length ? <EmptyState icon={FolderKanban} title="No hay proyectos que coincidan" description="Revisa el año y la búsqueda o crea una publicación." action={canCreateProject(user) ? { label: 'Nuevo proyecto', onClick: () => navigate(routePaths.adminProjectNew) } : undefined} /> : <div className="overflow-x-auto rounded-xl bg-white"><table className="w-full min-w-[750px] text-left text-sm"><thead><tr>{['Proyecto', 'Categoría', 'Año', 'País', 'Estado', 'Acciones'].map((title) => <th key={title} className="p-4" scope="col">{title}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[#dfe5ec]"><td className="p-4">{item.images[0] && <img src={item.images[0]} alt="" className="mb-2 h-16 w-24 rounded object-cover" />}{item.title}</td><td className="p-4">{item.category}</td><td className="p-4">{item.year}</td><td className="p-4">{item.country}</td><td className="p-4">{item.published ? 'Publicada' : 'Borrador'}</td><td className="p-4"><div className="flex flex-wrap gap-2">{item.published && <Link to={routePaths.projectDetail.replace(':slug', encodeURIComponent(item.id))} target="_blank" rel="noopener noreferrer">Ver en el sitio</Link>}{canEditProject(user, item) && <Link to={projectEditPath(item.id)}>Editar</Link>}{canToggleProject(user, item) && <LoadingButton disabled={busy} variant="outline" onClick={() => { void act(item); }}>{item.published ? 'Pasar a borrador' : 'Publicar'}</LoadingButton>}{canTrashProject(user, item) && <LoadingButton disabled={busy || !PROJECT_TRASH_ENABLED} variant="outline" onClick={() => setTrashing(item)}>Enviar a papelera</LoadingButton>}</div></td></tr>)}</tbody></table></div>}
    {!state.loading && !state.error && <nav aria-label="Paginación de proyectos" className="flex items-center justify-end gap-3"><LoadingButton variant="outline" disabled={page <= 1 || busy} onClick={() => setPage((value) => value - 1)}>Anterior</LoadingButton><span>Página {page} de {Math.max(1, Math.ceil(state.count / 12))} · {state.count} proyectos</span><LoadingButton variant="outline" disabled={page * 12 >= state.count || busy} onClick={() => setPage((value) => value + 1)}>Siguiente</LoadingButton></nav>}
    <ConfirmDialog open={Boolean(trashing)} title="Enviar proyecto a papelera" description={`¿Enviar «${trashing?.title}» a papelera?`} confirmLabel="Enviar a papelera" busy={busy} onCancel={() => setTrashing(null)} onConfirm={() => { void act(trashing, true); }} />
  </section>;
}
