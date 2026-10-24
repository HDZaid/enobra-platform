// <MultiImageUploader value={images} onChange={setImages} max={40} kind="photo" token={token} onBusyChange={setUploading} label="Fotografías" />
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { uploadMedia } from '../../services/uploadClient.js';
import { describeApiError } from './apiErrors.js';
import { createImageUploadQueue, imageSlots, IMAGE_TYPES, moveImage, validateImageFile, validUploadedImageUrl } from './imageUpload.js';
import { LoadingButton } from './LoadingButton.jsx';

export function MultiImageUploader({ value = [], onChange, max = 40, kind = 'photo', token, onBusyChange, label = 'Fotografías' }) {
  const id = useId();
  const queue = useRef(null);
  const current = useRef({ value, onChange, max, kind, token, onBusyChange });
  const [jobs, setJobs] = useState([]);
  const [errors, setErrors] = useState([]);
  useLayoutEffect(() => { current.current = { value, onChange, max, kind, token, onBusyChange }; });

  useEffect(() => {
    let lastBusy = false;
    const uploads = createImageUploadQueue(
      (file, options) => uploadMedia(file, { ...options, kind: current.current.kind, token: current.current.token }),
      {
        onUpdate: (items, busy) => {
          setJobs(items);
          if (busy !== lastBusy) { lastBusy = busy; current.current.onBusyChange?.(busy); }
        },
        onUploaded: (result) => {
          const props = current.current;
          if (!imageSlots(props.max, props.value.length)) throw new Error('Se alcanzó el límite de imágenes.');
          const next = [...props.value, result.url];
          current.current.value = next;
          props.onChange(next);
        },
      },
    );
    queue.current = uploads;
    return () => { uploads.dispose(); queue.current = null; if (lastBusy) current.current.onBusyChange?.(false); };
  }, []);

  function select(files) {
    const props = current.current;
    let remaining = imageSlots(props.max, props.value.length, queue.current.count());
    const accepted = [];
    const rejected = [];
    for (const file of Array.from(files)) {
      const error = validateImageFile(file);
      if (error) rejected.push(`${file.name}: ${error}`);
      else if (!remaining) rejected.push(`${file.name}: se alcanzó el límite de ${max} imágenes.`);
      else { accepted.push(file); remaining -= 1; }
    }
    setErrors(rejected);
    queue.current.add(accepted);
  }
  function change(next) { current.current.value = next; onChange(next); }

  return <section aria-labelledby={`${id}-label`} className="space-y-4">
    <h3 id={`${id}-label`} className="font-semibold text-[#12233f]">{label}</h3>
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files); }}
      className="rounded-xl border-2 border-dashed border-[#dfe5ec] bg-[#f3f6fa] p-5">
      <label htmlFor={`${id}-files`} className="block text-sm font-semibold">Seleccionar imágenes o arrastrarlas aquí</label>
      <p id={`${id}-help`} className="my-2 text-xs text-[#626b79]">JPEG, PNG, WebP o GIF, hasta 10 MB por archivo. Máximo {max}. La primera imagen es la portada.</p>
      <input id={`${id}-files`} type="file" multiple accept={IMAGE_TYPES.join(',')} aria-describedby={`${id}-help`}
        disabled={!imageSlots(max, value.length, jobs.length)}
        className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-[#304e7d] file:p-2 file:text-white"
        onChange={(event) => { select(event.target.files); event.target.value = ''; }} />
    </div>
    {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm text-[#a62b2b]">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    <p role="status" className="text-sm text-[#626b79]">{value.length} imágenes listas · {jobs.filter((job) => ['queued', 'uploading'].includes(job.status)).length} pendientes</p>
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {value.map((url, index) => <li key={`${index}:${url}`} className="space-y-3 rounded-lg border border-[#dfe5ec] p-3">
        {validUploadedImageUrl(url) && <img src={url} alt={`${label} ${index + 1}${index === 0 ? ', portada' : ''}`} className="aspect-video w-full rounded object-cover" />}
        <p className="text-sm font-semibold">{index === 0 ? 'Portada' : `Imagen ${index + 1}`}</p>
        <div className="flex flex-wrap gap-2">
          <LoadingButton variant="outline" disabled={index === 0} aria-label={`Mover imagen ${index + 1} antes`} onClick={() => change(moveImage(current.current.value, index, index - 1))}>Antes</LoadingButton>
          <LoadingButton variant="outline" disabled={index === value.length - 1} aria-label={`Mover imagen ${index + 1} después`} onClick={() => change(moveImage(current.current.value, index, index + 1))}>Después</LoadingButton>
          <LoadingButton variant="outline" aria-label={`Quitar imagen ${index + 1}`} onClick={() => change(current.current.value.filter((_, position) => position !== index))}>Quitar</LoadingButton>
        </div>
      </li>)}
    </ol>
    <ul className="space-y-3">{jobs.map((job) => <li key={job.id} className="space-y-2 rounded-lg border border-[#dfe5ec] p-4">
      <p className="break-words text-sm font-semibold">{job.file.name}</p>
      {job.status === 'uploading' && <><progress max={100} value={job.progress} aria-label={`Progreso de ${job.file.name}`} className="w-full" /><p className="text-xs">{job.progress === 100 ? 'Esperando confirmación del servidor…' : `${job.progress}%`}</p></>}
      {job.status === 'queued' && <p className="text-sm">En espera…</p>}
      {job.status === 'cancelled' && <p className="text-sm">Subida cancelada.</p>}
      {job.status === 'error' && <p role="alert" className="text-sm text-[#a62b2b]">{describeApiError(job.error, { action: 'subir la imagen' })}</p>}
      <div className="flex flex-wrap gap-2">
        {['queued', 'uploading'].includes(job.status)
          ? <LoadingButton variant="outline" aria-label={`Cancelar ${job.file.name}`} onClick={() => queue.current.cancel(job.id)}>Cancelar</LoadingButton>
          : <LoadingButton variant="outline" aria-label={`Reintentar ${job.file.name}`} onClick={() => queue.current.retry(job.id)}>Reintentar</LoadingButton>}
        <LoadingButton variant="outline" aria-label={`Quitar ${job.file.name}`} onClick={() => queue.current.remove(job.id)}>Quitar</LoadingButton>
      </div>
    </li>)}</ul>
  </section>;
}
