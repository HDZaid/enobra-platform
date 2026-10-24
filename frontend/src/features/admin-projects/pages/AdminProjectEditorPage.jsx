import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { routePaths } from '../../../app/routePaths.js';
import { MultiImageUploader } from '../../../components/ui/MultiImageUploader.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Notice } from '../../../components/ui/Notice.jsx';
import { FormSkeleton } from '../../../components/ui/Skeleton.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { fieldErrors } from '../../../components/ui/apiErrors.js';
import { adminProjectsService } from '../services/adminProjectsService.js';
import { canCreateProject, canEditProject, canPublishProject, makeProjectPayload, projectDraft, validateProject } from '../utils/projects.js';

export function AdminProjectEditorPage() {
  const { slug } = useParams();
  const { session, preview } = useOutletContext();
  const [state, setState] = useState({ key: null, item: null, error: null });
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState([]);
  const token = session?.access;
  useEffect(() => {
    document.title = `${slug ? 'Editar' : 'Nuevo'} proyecto | EnObra`;
    if (preview || !token) return;
    const controller = new AbortController();
    adminProjectsService.list({}, token, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setCategories([...new Set(data.results.map((item) => item.category))]);
    }).catch(() => {}); // Sugerencias opcionales: la categoría sigue siendo texto libre.
    if (slug) adminProjectsService.get(slug, token, { signal: controller.signal }).then((item) => {
      if (!controller.signal.aborted) setState({ key: slug, item, error: null });
    }).catch((error) => { if (!controller.signal.aborted) setState({ key: slug, item: null, error }); });
    return () => controller.abort();
  }, [slug, token, preview, retry]);
  if (preview) return <Notice type="info">Inicia sesión para crear o editar proyectos. No se guardan publicaciones desde la vista previa.</Notice>;
  if (slug && state.key !== slug) return <FormSkeleton fields={7} />;
  if (slug && state.error) return <ErrorState error={state.error} action="consultar el proyecto" onRetry={() => { setState({ key: null, item: null, error: null }); setRetry((value) => value + 1); }} />;
  if (slug ? !canEditProject(session?.user, state.item) : !canCreateProject(session?.user)) return <Notice type="error">No tienes permiso para {slug ? 'editar este' : 'crear un'} proyecto.</Notice>;
  return <ProjectForm key={slug || 'new'} item={slug ? state.item : null} categories={categories} user={session.user} token={token} />;
}

function ProjectForm({ item, categories, user, token }) {
  const navigate = useNavigate();
  const [original] = useState(() => projectDraft(item));
  const [draft, setDraft] = useState(() => projectDraft(item));
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState(false);
  const submitting = useRef(false);
  const saved = useRef(false);
  const dirty = JSON.stringify(original) !== JSON.stringify(draft);
  const uploading = photoBusy || renderBusy;
  const publish = canPublishProject(user);
  const blocked = saving || uploading;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !saved.current && (dirty || uploading || saving) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty && !blocked) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, blocked]);
  function update(key, value) { setDraft((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || uploading) return;
    const invalid = validateProject(draft);
    setErrors(invalid); setRequestError(null);
    if (Object.keys(invalid).length) return;
    submitting.current = true; setSaving(true);
    try {
      const payload = makeProjectPayload(draft, { canPublish: publish });
      if (item) await adminProjectsService.update(item.id, payload, token);
      else await adminProjectsService.create(payload, token);
      saved.current = true;
      navigate(routePaths.adminProjects);
    } catch (error) { setRequestError(error); setErrors(fieldErrors(error)); }
    finally { submitting.current = false; setSaving(false); }
  }
  const input = 'mt-1 block w-full rounded-lg border border-[#dfe5ec] bg-white p-3 text-sm';
  return <section className="space-y-5">
    <Link to={routePaths.adminProjects} className="text-sm underline">Volver a proyectos</Link>
    <h2 className="text-3xl font-semibold">{item ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
    {item && <label className="block text-sm">Identificador (no cambia al editar el título)<input className={input} value={item.id} readOnly /></label>}
    <form onSubmit={(event) => { void submit(event); }} noValidate className="space-y-5 rounded-xl bg-white p-6">
      <fieldset disabled={saving} className="space-y-5">
        {[['title', 'Título', 160], ['category', 'Categoría', 80], ['country', 'País', 80], ['year', 'Año', 4]].map(([key, label, max]) => <div key={key}><label className="block text-sm font-semibold" htmlFor={`project-${key}`}>{label} *</label><input id={`project-${key}`} className={input} value={draft[key]} maxLength={max} inputMode={key === 'year' ? 'numeric' : undefined} list={key === 'category' ? 'project-categories' : undefined} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `project-${key}-error` : undefined} />{errors[key] && <p id={`project-${key}-error`} role="alert" className="mt-1 text-sm text-red-700">{errors[key]}</p>}</div>)}
        <datalist id="project-categories">{[...new Set([item?.category, ...categories].filter(Boolean))].map((category) => <option key={category} value={category} />)}</datalist>
        <label className="block text-sm font-semibold" htmlFor="project-description">Descripción *</label><textarea id="project-description" className={input} rows={7} value={draft.description} onChange={(event) => update('description', event.target.value)} aria-invalid={Boolean(errors.description)} />{errors.description && <p role="alert" className="text-sm text-red-700">{errors.description}</p>}
        <MultiImageUploader value={draft.images} onChange={(value) => update('images', value)} max={40} kind="photo" token={token} onBusyChange={setPhotoBusy} label="Fotografías *" />
        {errors.images && <p role="alert" className="text-sm text-red-700">{errors.images}</p>}
        <MultiImageUploader value={draft.renders} onChange={(value) => update('renders', value)} max={40} kind="render" token={token} onBusyChange={setRenderBusy} label="Renders" />
        {errors.renders && <p role="alert" className="text-sm text-red-700">{errors.renders}</p>}
        <label className="block text-sm font-semibold" htmlFor="project-video">Video de YouTube (opcional)</label><input id="project-video" className={input} value={draft.video} onChange={(event) => update('video', event.target.value)} aria-invalid={Boolean(errors.video)} />{errors.video && <p role="alert" className="text-sm text-red-700">{errors.video}</p>}
        {publish ? <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.published} onChange={(event) => update('published', event.target.checked)} />Publicar proyecto</label> : <Notice type="info">No tienes permiso de publicación. El proyecto se guardará como borrador.</Notice>}
        {errors.published && <p role="alert" className="text-sm text-red-700">{errors.published}</p>}
      </fieldset>
      {uploading && <Notice type="info">Espera a que terminen las subidas antes de guardar.</Notice>}
      {requestError && <ErrorState error={requestError} action="guardar el proyecto" />}
      <div className="flex flex-wrap gap-3"><LoadingButton type="submit" loading={saving} loadingText="Guardando…" disabled={uploading}>Guardar proyecto</LoadingButton><Link className="rounded-lg border px-4 py-2 text-sm" to={routePaths.adminProjects}>Cancelar</Link></div>
    </form>
    <ConfirmDialog open={blocker.state === 'blocked'} title="Cambios sin guardar" description={blocked ? 'Espera a que termine la operación antes de salir.' : 'Si sales, perderás los cambios del formulario. Las imágenes ya subidas pueden permanecer en el servidor.'} busy={blocked} confirmLabel="Descartar cambios y salir" onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()} />
  </section>;
}
