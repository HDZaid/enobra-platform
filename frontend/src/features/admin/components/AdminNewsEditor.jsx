import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Save, X } from 'lucide-react';
import { adminMediaService } from '../services/adminMediaService.js';
import {
  adminNewsImageSrc, makeNewsPayload, newsCategories, validateNewsDraft,
} from '../utils/newsEditor.js';
import { fieldErrors } from '../../../components/ui/apiErrors.js';
import { newsPayloadForPermissions } from '../utils/adminData.js';
import { formatNewsDate, newsDraftHasChanges, newsPreviewContent } from '../utils/newsWorkflow.js';

const inputClass = 'mt-1.5 w-full rounded-lg border border-[#dfe5ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#304e7d] focus:ring-2 focus:ring-[#304e7d]/15';
const labelClass = 'block text-xs font-semibold text-[#304057]';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function initialDraft(item, preview) {
  return {
    title: item?.title || '', category: item?.category || 'Anuncios',
    date: item?.date || today(), description: item?.description || '',
    image: item?.image || '', demo: preview ? true : item?.demo ?? false,
    published: item?.published ?? false,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export function AdminNewsEditor({ item, preview, token, canPublish = false, onClose, onSaved, onSaveRemote }) {
  const [original] = useState(() => initialDraft(item, preview));
  const [draft, setDraft] = useState(() => initialDraft(item, preview));
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const hasChanges = newsDraftHasChanges(original, draft, file);
  const requestClose = useCallback(() => {
    if (submitting) return;
    if (hasChanges) setConfirmDiscard(true);
    else onClose();
  }, [hasChanges, onClose, submitting]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (confirmDiscard) setConfirmDiscard(false);
      else requestClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmDiscard, requestClose]);

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setConfirmDiscard(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const action = event.nativeEvent?.submitter?.value || 'keep';
    const published = !canPublish ? (item?.published ?? false) : action === 'published' ? true : action === 'draft' ? false : draft.published;
    const candidate = { ...draft, published };
    const validation = validateNewsDraft(candidate, { preview, file });
    setErrors(validation);
    setRequestError('');
    if (Object.keys(validation).length) return;
    setSubmitting(true);
    try {
      if (preview) {
        const image = file ? await readFileAsDataUrl(file) : draft.image.trim();
        onSaved({ ...candidate, image, title: draft.title.trim(), description: draft.description.trim(),
          id: item?.id || `preview-${crypto.randomUUID()}`, demo: true });
      } else {
        // El upload devuelve la referencia que espera Django; no enviamos data URI al backend.
        const image = file ? await adminMediaService.uploadNewsImage(file, token) : draft.image;
        await onSaveRemote(item, newsPayloadForPermissions(makeNewsPayload(candidate, image), { existing: Boolean(item), canPublish }));
      }
    } catch (error) {
      setErrors(fieldErrors(error));
      setRequestError(error?.status === 401 || error?.status === 403
        ? 'No tienes una sesión autorizada para guardar noticias.'
        : error?.status === 400
          ? 'Django rechazó los datos. Revisa la imagen y los campos obligatorios.'
          : error?.status === 501
            ? 'La operación no está disponible en el servidor conectado.'
            : 'No se pudo guardar la noticia. No se ha confirmado ningún cambio.');
    } finally {
      setSubmitting(false);
    }
  }

  const imageSrc = filePreview || adminNewsImageSrc(draft.image, preview);
  const previewData = newsPreviewContent(draft, imageSrc);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#09172b]/70 px-3 py-6 sm:px-6"
      role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="news-editor-title" className="w-full max-w-[840px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#dfe5ec] px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#b94308] uppercase">Administración · Noticias</p>
            <h3 id="news-editor-title" className="mt-1 font-['Montserrat',Arial,sans-serif] text-2xl font-semibold">{item ? 'Editar noticia' : 'Nueva noticia'}</h3>
            <p className="mt-1 text-xs text-[#626b79]">Los campos marcados con * son obligatorios.</p>
          </div>
          <button type="button" onClick={requestClose} disabled={submitting} aria-label="Cerrar editor" className="rounded-lg p-2 hover:bg-[#f3f6fa] disabled:opacity-50"><X size={21}/></button>
        </div>
        <form onSubmit={(event) => { void submit(event); }} noValidate className="space-y-5 px-6 py-6">
          {preview && <p role="status" className="rounded-lg bg-[#fff1e5] px-4 py-3 text-xs leading-relaxed text-[#88420d]">Demostración: los cambios se perderán al recargar y no se envían a Django ni se publican en el sitio.</p>}
          <div>
            <label className={labelClass} htmlFor="news-title">Título *</label>
            <input id="news-title" className={inputClass} maxLength={160} value={draft.title} onChange={(e) => update('title', e.target.value)} placeholder="Título de la noticia" autoFocus aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'news-title-error' : 'news-title-help'}/>
            <div className="mt-1 flex justify-between gap-3 text-xs text-[#626b79]"><span id="news-title-help">Usa un título claro y descriptivo.</span><span>{draft.title.length}/160</span></div>
            {errors.title && <p id="news-title-error" className="mt-1 text-xs text-red-700">{errors.title}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="news-category">Categoría *</label><select id="news-category" className={inputClass} value={draft.category} onChange={(e) => update('category', e.target.value)} aria-invalid={Boolean(errors.category)}>{newsCategories.map((category) => <option key={category}>{category}</option>)}</select>{errors.category && <p className="mt-1 text-xs text-red-700">{errors.category}</p>}</div>
            <div><label className={labelClass} htmlFor="news-date">Fecha *</label><input id="news-date" type="date" className={inputClass} value={draft.date} onChange={(e) => update('date', e.target.value)} aria-invalid={Boolean(errors.date)}/>{errors.date && <p className="mt-1 text-xs text-red-700">{errors.date}</p>}</div>
          </div>
          <div>
            <label className={labelClass} htmlFor="news-description">Contenido *</label>
            <textarea id="news-description" rows={7} className={inputClass} value={draft.description} onChange={(e) => update('description', e.target.value)} placeholder="Escribe el contenido de la noticia…" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'news-description-error' : undefined}/>
            <p className="mt-1 text-right text-xs text-[#626b79]">{draft.description.length} caracteres</p>
            {errors.description && <p id="news-description-error" className="mt-1 text-xs text-red-700">{errors.description}</p>}
          </div>
          <div className="rounded-xl border border-[#dfe5ec] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ImagePlus size={18}/> Imagen de portada *</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-[#f3f6fa]">{imageSrc ? <img src={imageSrc} alt="Vista previa de portada" className="h-full w-full object-cover"/> : <ImagePlus size={35} className="text-[#8895a7]"/>}</div>
              <div>
                <label className={labelClass} htmlFor="news-image-file">Subir imagen (JPG, PNG, WebP, GIF; máximo 10 MB)</label>
                <input id="news-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#304e7d] file:px-3 file:py-2 file:text-white" onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors((current) => ({ ...current, image: undefined })); }}/>
                <p className="mt-3 text-xs text-[#626b79]">{preview ? 'En demostración se aceptan /assets/ y HTTPS.' : 'Django acepta HTTPS o /media/.'} También puedes escribir una referencia.</p>
                <input aria-label="Referencia de imagen" className={inputClass} value={draft.image.startsWith('data:') ? '' : draft.image} onChange={(e) => { update('image', e.target.value); setFile(null); setFilePreview(''); }} placeholder={preview ? '/assets/estructura.jpg' : 'https://... o /media/...'} aria-invalid={Boolean(errors.image)} aria-describedby={errors.image ? 'news-image-error' : undefined}/>
                {errors.image && <p id="news-image-error" className="mt-1 text-xs text-red-700">{errors.image}</p>}
              </div>
            </div>
          </div>
          {!preview && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.demo} onChange={(e) => update('demo', e.target.checked)}/> Marcar como referencia</label>}
          <div className="overflow-hidden rounded-xl border border-[#dfe5ec]">
            <button type="button" onClick={() => setShowPreview((current) => !current)} aria-expanded={showPreview} aria-controls="news-live-preview" className="flex w-full items-center justify-between bg-[#f3f6fa] px-4 py-3 text-sm font-semibold hover:bg-[#e8edf4]">
              <span className="inline-flex items-center gap-2">{showPreview ? <EyeOff size={17}/> : <Eye size={17}/>} Vista previa editorial</span><span className="text-xs text-[#626b79]">{showPreview ? 'Ocultar' : 'Mostrar'}</span>
            </button>
            {showPreview && <div id="news-live-preview" className="p-4 sm:p-5">
              <p className="text-[11px] font-bold tracking-[.12em] text-[#b94308] uppercase">{previewData.category} · {formatNewsDate(previewData.date)}</p>
              <h4 className="mt-2 font-['Montserrat',Arial,sans-serif] text-[clamp(23px,4vw,32px)] font-semibold leading-tight break-words">{previewData.title}</h4>
              <div className="mt-4 flex aspect-[2/1] max-h-64 items-center justify-center overflow-hidden rounded-lg bg-[#f3f6fa]">{previewData.image ? <img src={previewData.image} alt="Portada de la publicación" className="h-full w-full object-cover"/> : <ImagePlus size={30} className="text-[#8895a7]"/>}</div>
              <p className="mt-4 max-h-56 overflow-auto whitespace-pre-line break-words text-sm leading-relaxed text-[#626b79]">{previewData.description}</p>
              <p className="mt-3 text-xs text-[#626b79]">Vista de edición. No representa una publicación real hasta que Django confirme el guardado.</p>
            </div>}
          </div>
          {requestError && <p role="alert" className="rounded-lg bg-[#fdeaea] p-3 text-sm text-[#9c2929]">{requestError}</p>}
          {confirmDiscard && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm"><p className="min-w-0 flex-1 text-[#88420d]">Tienes cambios sin guardar. ¿Quieres descartarlos?</p><button type="button" onClick={onClose} className="rounded-lg bg-[#b64242] px-4 py-2 text-xs font-semibold text-white">Descartar cambios</button><button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-lg border border-[#dfe5ec] bg-white px-4 py-2 text-xs font-semibold">Seguir editando</button></div>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#dfe5ec] pt-5">
            <button type="button" disabled={submitting} onClick={requestClose} className="rounded-lg border border-[#dfe5ec] px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Cancelar</button>
            {item && <button type="submit" name="publication" value="keep" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg border border-[#304e7d] px-4 py-2.5 text-sm font-semibold text-[#304e7d] disabled:opacity-50"><Save size={16}/> Guardar cambios</button>}
            {!canPublish && <p role="status" className="w-full text-sm text-[#626b79]">No tienes permiso para cambiar la publicación. {item ? 'Se conservará su estado actual.' : 'La noticia se guardará como borrador.'}</p>}
            {(canPublish || !item) && <button type="submit" name="publication" value="draft" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg border border-[#dfe5ec] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Guardar borrador</button>}
            {canPublish && <button type="submit" name="publication" value="published" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b94308] disabled:opacity-50">{submitting ? 'Guardando…' : 'Guardar y publicar'}</button>}
          </div>
        </form>
      </section>
    </div>
  );
}
