import { useEffect, useState } from 'react';
import { ImagePlus, Save, X } from 'lucide-react';
import { adminMediaService } from '../services/adminMediaService.js';
import {
  adminNewsImageSrc, makeNewsPayload, newsCategories, validateNewsDraft,
} from '../utils/newsEditor.js';

const inputClass = 'mt-1.5 w-full rounded-lg border border-[#dfe5ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#304e7d] focus:ring-2 focus:ring-[#304e7d]/15';
const labelClass = 'block text-xs font-semibold text-[#304057]';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function initialDraft(item, preview) {
  return {
    title: item?.title || '',
    category: item?.category || 'Anuncios',
    date: item?.date || today(),
    description: item?.description || '',
    image: item?.image || '',
    demo: preview ? true : item?.demo ?? false,
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

export function AdminNewsEditor({ item, preview, token, onClose, onSaved, onSaveRemote }) {
  const [draft, setDraft] = useState(() => initialDraft(item, preview));
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const validation = validateNewsDraft(draft, { preview, file });
    setErrors(validation);
    setRequestError('');
    if (Object.keys(validation).length) return;
    setSubmitting(true);
    try {
      if (preview) {
        const image = file ? await readFileAsDataUrl(file) : draft.image.trim();
        onSaved({ ...draft, image, title: draft.title.trim(), description: draft.description.trim(),
          id: item?.id || `preview-${crypto.randomUUID()}`, demo: true });
      } else {
        // Primero se sube el archivo, después se envía la referencia al endpoint de Noticias.
        // Si la noticia falla al guardarse, el backend debe gestionar archivos huérfanos.
        const image = file ? await adminMediaService.uploadNewsImage(file, token) : draft.image;
        const payload = makeNewsPayload(draft, image);
        await onSaveRemote(item, payload);
      }
    } catch (error) {
      setRequestError(error?.status === 501
        ? 'El backend todavía no implementa esta operación.'
        : error?.status === 401 || error?.status === 403
          ? 'No tienes una sesión autorizada para guardar noticias.'
          : error?.status === 400
            ? 'Django rechazó los datos. Revisa la imagen y los campos obligatorios.'
            : 'No se pudo guardar la noticia. No se ha confirmado ningún cambio.');
    } finally {
      setSubmitting(false);
    }
  }

  const imageSrc = filePreview || adminNewsImageSrc(draft.image, preview);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#09172b]/70 px-3 py-6 sm:px-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="news-editor-title" className="w-full max-w-[760px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#dfe5ec] px-6 py-5">
          <div><p className="text-xs font-semibold tracking-widest text-[#b94308] uppercase">Administración · Noticias</p><h3 id="news-editor-title" className="mt-1 font-['Outfit',Arial,sans-serif] text-2xl font-semibold">{item ? 'Editar noticia' : 'Nueva noticia'}</h3></div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar editor" className="rounded-lg p-2 hover:bg-[#f3f6fa] disabled:opacity-50"><X size={21}/></button>
        </div>
        <form onSubmit={(event) => { void submit(event); }} noValidate className="space-y-5 px-6 py-6">
          {preview && <p role="status" className="rounded-lg bg-[#fff1e5] px-4 py-3 text-xs leading-relaxed text-[#88420d]">Prueba local: los cambios se perderán al recargar la página. No se envían a Django ni se publican en el sitio.</p>}
          <div><label className={labelClass} htmlFor="news-title">Título *</label><input id="news-title" className={inputClass} maxLength={160} value={draft.title} onChange={(e) => update('title', e.target.value)} placeholder="Título de la noticia" autoFocus/>{errors.title && <p className="mt-1 text-xs text-red-700">{errors.title}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="news-category">Categoría *</label><select id="news-category" className={inputClass} value={draft.category} onChange={(e) => update('category', e.target.value)}>{newsCategories.map((category) => <option key={category}>{category}</option>)}</select>{errors.category && <p className="mt-1 text-xs text-red-700">{errors.category}</p>}</div>
            <div><label className={labelClass} htmlFor="news-date">Fecha *</label><input id="news-date" type="date" className={inputClass} value={draft.date} onChange={(e) => update('date', e.target.value)}/>{errors.date && <p className="mt-1 text-xs text-red-700">{errors.date}</p>}</div>
          </div>
          <div><label className={labelClass} htmlFor="news-description">Descripción *</label><textarea id="news-description" rows={5} className={inputClass} value={draft.description} onChange={(e) => update('description', e.target.value)} placeholder="Escribe el contenido de la noticia…"/>{errors.description && <p className="mt-1 text-xs text-red-700">{errors.description}</p>}</div>
          <div className="rounded-xl border border-[#dfe5ec] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ImagePlus size={18}/> Imagen de portada *</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-[#f3f6fa]">{imageSrc ? <img src={imageSrc} alt="Vista previa de portada" className="h-full w-full object-cover"/> : <ImagePlus size={35} className="text-[#8895a7]"/>}</div>
              <div>
                <label className={labelClass} htmlFor="news-image-file">Subir imagen (JPG, PNG, WebP, GIF; máximo 10 MB)</label>
                <input id="news-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#304e7d] file:px-3 file:py-2 file:text-white" onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors((current) => ({ ...current, image: undefined })); }}/>
                <p className="mt-3 text-xs text-[#626b79]">O utiliza una referencia de imagen. {preview ? 'En la vista previa se aceptan /assets/ y enlaces HTTPS.' : 'Django admite HTTPS o /media/.'}</p>
                <input aria-label="Referencia de imagen" className={inputClass} value={draft.image.startsWith('data:') ? '' : draft.image} onChange={(e) => { update('image', e.target.value); setFile(null); setFilePreview(''); }} placeholder={preview ? '/assets/estructura.jpg' : 'https://... o /media/...'} />
                {errors.image && <p className="mt-1 text-xs text-red-700">{errors.image}</p>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.published} onChange={(e) => update('published', e.target.checked)}/> Publicado</label>
            {!preview && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.demo} onChange={(e) => update('demo', e.target.checked)}/> Marcar como ejemplo</label>}
          </div>
          {requestError && <p role="alert" className="rounded-lg bg-[#fdeaea] p-3 text-sm text-[#9c2929]">{requestError}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#dfe5ec] pt-5"><button type="button" disabled={submitting} onClick={onClose} className="rounded-lg border border-[#dfe5ec] px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Cancelar</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b94308] disabled:opacity-60"><Save size={17}/>{submitting ? 'Guardando…' : preview ? 'Aplicar en vista previa' : 'Guardar noticia'}</button></div>
        </form>
      </section>
    </div>
  );
}
