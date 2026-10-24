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
import { adminPropertiesService } from '../services/adminPropertiesService.js';
import { canCreateProperty, canEditProperty } from '../utils/propertyPermissions.js';
import { hasAdminPermission } from '../../admin/utils/adminData.js';
import { OPERATIONS, PROPERTY_LIMITS, PROPERTY_TYPES, hasNoRooms, makePropertyPayload, propertyDraft, validatePropertyDraft } from '../utils/propertyForm.js';

const input = 'mt-1 block w-full rounded-lg border border-[#dfe5ec] bg-white p-3 text-sm';
const legend = 'text-lg font-semibold text-[#304e7d]';

export function AdminPropertyEditorPage() {
  const { id } = useParams();
  const { session, preview } = useOutletContext();
  const [state, setState] = useState({ key: null, item: null, error: null });
  const [retry, setRetry] = useState(0);
  const token = session?.access;
  useEffect(() => {
    document.title = `${id ? 'Editar' : 'Nueva'} propiedad | EnObra`;
    if (preview || !token || !id) return;
    const controller = new AbortController();
    adminPropertiesService.get(id, token, { signal: controller.signal }).then((item) => {
      if (!controller.signal.aborted) setState({ key: id, item, error: null });
    }).catch((error) => { if (!controller.signal.aborted) setState({ key: id, item: null, error }); });
    return () => controller.abort();
  }, [id, token, preview, retry]);
  if (preview) return <Notice type="info">Inicia sesión para crear o editar propiedades. No se guardan publicaciones desde la vista previa.</Notice>;
  if (id && state.key !== id) return <FormSkeleton fields={8} />;
  if (id && state.error) return <ErrorState error={state.error} action="consultar la propiedad" onRetry={() => { setState({ key: null, item: null, error: null }); setRetry((value) => value + 1); }} />;
  if (id ? !canEditProperty(session?.user, state.item) : !canCreateProperty(session?.user)) return <Notice type="error">No tienes permiso para {id ? 'editar esta' : 'crear una'} propiedad.</Notice>;
  return <PropertyForm key={id || 'new'} item={id ? state.item : null} user={session.user} token={token} />;
}

function Field({ id, label, error, hint, children }) {
  return <div>
    <label className="block text-sm font-semibold" htmlFor={id}>{label}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-[#5b6b82]">{hint}</p>}
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
  </div>;
}

function PropertyForm({ item, user, token }) {
  const navigate = useNavigate();
  const [original] = useState(() => propertyDraft(item));
  const [draft, setDraft] = useState(() => propertyDraft(item));
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState(false);
  const submitting = useRef(false);
  const saved = useRef(false);
  const dirty = JSON.stringify(original) !== JSON.stringify(draft);
  const uploading = photoBusy || renderBusy;
  const canPublish = hasAdminPermission(user, 'properties.publish');
  const blocked = saving || uploading;
  const noRooms = hasNoRooms(draft.type);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !saved.current && (dirty || uploading || saving) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty && !blocked) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, blocked]);
  function update(key, value) { setDraft((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  const bind = (key) => ({ id: `property-${key}`, className: input, value: draft[key], 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `property-${key}-error` : undefined, onChange: (event) => update(key, event.target.value) });

  async function submit(publish) {
    if (submitting.current || uploading) return;
    const next = { ...draft, published: publish };
    const invalid = validatePropertyDraft(next);
    setErrors(invalid); setRequestError(null);
    if (Object.keys(invalid).length) { document.getElementById(`property-${Object.keys(invalid)[0]}`)?.focus(); return; }
    submitting.current = true; setSaving(true);
    try {
      const payload = makePropertyPayload(next, { canPublish, publish });
      if (item) await adminPropertiesService.update(item.id, payload, token);
      else await adminPropertiesService.create(payload, token);
      saved.current = true;
      navigate(routePaths.adminProperties);
    } catch (error) { setRequestError(error); setErrors(fieldErrors(error)); }
    finally { submitting.current = false; setSaving(false); }
  }

  return <section className="space-y-5">
    <Link to={routePaths.adminProperties} className="text-sm underline">Volver a bienes raíces</Link>
    <h2 className="text-3xl font-semibold">{item ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
    {item && <p className="text-sm text-[#5b6b82]">Estado actual: <strong>{item.published ? 'Publicada' : 'Borrador'}</strong></p>}
    <form onSubmit={(event) => { event.preventDefault(); void submit(item ? draft.published : false); }} noValidate className="space-y-8 rounded-xl bg-white p-6">
      <fieldset disabled={saving} className="space-y-8">
        <div className="space-y-4">
          <h3 className={legend}>Información general</h3>
          <Field id="property-title" label="Título *" error={errors.title}><input {...bind('title')} maxLength={PROPERTY_LIMITS.title} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="property-operation" label="Operación *" error={errors.operation}><select {...bind('operation')}>{OPERATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field id="property-type" label="Tipo *" error={errors.type}><select {...bind('type')}>{PROPERTY_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Ubicación</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="property-zone" label="Zona *" error={errors.zone} hint="Ej.: Zona 10, Carretera a El Salvador."><input {...bind('zone')} maxLength={PROPERTY_LIMITS.zone} /></Field>
            <Field id="property-location" label="Ubicación *" error={errors.location} hint="Colonia, residencial o dirección de referencia."><input {...bind('location')} maxLength={PROPERTY_LIMITS.location} /></Field>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Características</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="property-area" label="Área (m²) *" error={errors.area}><input {...bind('area')} inputMode="numeric" /></Field>
            <Field id="property-date" label="Fecha *" error={errors.date}><input {...bind('date')} type="date" /></Field>
          </div>
          {noRooms ? <Notice type="info">Un terreno no tiene habitaciones, baños ni parqueos: se guardan en cero.</Notice> : <div className="grid gap-4 sm:grid-cols-3">
            <Field id="property-rooms" label="Habitaciones *" error={errors.rooms}><input {...bind('rooms')} inputMode="numeric" /></Field>
            <Field id="property-baths" label="Baños *" error={errors.baths}><input {...bind('baths')} inputMode="numeric" /></Field>
            <Field id="property-parking" label="Parqueos *" error={errors.parking}><input {...bind('parking')} inputMode="numeric" /></Field>
          </div>}
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Precio y condiciones</h3>
          <Field id="property-price" label={`Precio (Q${draft.operation === 'Alquiler' ? ' por mes' : ''}) *`} error={errors.price}><input {...bind('price')} inputMode="numeric" /></Field>
          <Field id="property-commercial" label="Condiciones comerciales *" error={errors.commercial} hint="Forma de pago, requisitos, documentación."><textarea {...bind('commercial')} rows={4} /></Field>
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Descripción</h3>
          <Field id="property-description" label="Descripción *" error={errors.description}><textarea {...bind('description')} rows={7} /></Field>
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Multimedia</h3>
          <MultiImageUploader value={draft.images} onChange={(value) => update('images', value)} max={PROPERTY_LIMITS.images} kind="photo" token={token} onBusyChange={setPhotoBusy} label="Fotografías *" />
          {errors.images && <p role="alert" className="text-sm text-red-700">{errors.images}</p>}
          <MultiImageUploader value={draft.renders} onChange={(value) => update('renders', value)} max={PROPERTY_LIMITS.images} kind="render" token={token} onBusyChange={setRenderBusy} label="Renders" />
          {errors.renders && <p role="alert" className="text-sm text-red-700">{errors.renders}</p>}
          <Field id="property-video" label="Video de YouTube (opcional)" error={errors.video}><input {...bind('video')} /></Field>
        </div>
        <div className="space-y-4">
          <h3 className={legend}>Revisión</h3>
          {canPublish ? <p className="text-sm">«Guardar y publicar» hace visible la propiedad en el sitio. «Guardar borrador» la deja solo en el panel.</p> : <Notice type="info">{item?.published ? 'No tienes permiso de publicación: al guardar, la propiedad volverá a borrador.' : 'No tienes permiso de publicación. La propiedad se guardará como borrador.'}</Notice>}
          {errors.published && <p role="alert" className="text-sm text-red-700">{errors.published}</p>}
        </div>
      </fieldset>
      {Object.values(errors).some(Boolean) && <Notice type="error">Revisa los campos marcados en el formulario.</Notice>}
      {uploading && <Notice type="info">Espera a que terminen las subidas antes de guardar.</Notice>}
      {requestError && <ErrorState error={requestError} action="guardar la propiedad" />}
      <div className="flex flex-wrap gap-3">
        <LoadingButton type="submit" loading={saving} loadingText="Guardando…" disabled={uploading}>Guardar borrador</LoadingButton>
        {canPublish && <LoadingButton type="button" loading={saving} loadingText="Guardando…" disabled={uploading} onClick={() => { void submit(true); }}>Guardar y publicar</LoadingButton>}
        <Link className="rounded-lg border px-4 py-2 text-sm" to={routePaths.adminProperties}>Cancelar</Link>
      </div>
    </form>
    <ConfirmDialog open={blocker.state === 'blocked'} title="Cambios sin guardar" description={blocked ? 'Espera a que termine la operación antes de salir.' : 'Si sales, perderás los cambios del formulario. Las imágenes ya subidas pueden permanecer en el servidor.'} busy={blocked} confirmLabel="Descartar cambios y salir" onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()} />
  </section>;
}
