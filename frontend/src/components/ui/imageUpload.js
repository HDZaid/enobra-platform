export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file) {
  if (!file || !IMAGE_TYPES.includes(file.type)) return 'Selecciona una imagen JPEG, PNG, WebP o GIF.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return 'La imagen debe pesar más de 0 bytes y hasta 10 MB.';
  return null;
}

export function validUploadedImageUrl(value) {
  if (typeof value !== 'string' || value.length > 500 || /[\s\\]/.test(value)) return false;
  if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  if (/^\/media\/[\w./-]+$/.test(value) && !value.includes('..')) return true;
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function imageSlots(max, saved, pending = 0) {
  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 40;
  return Math.max(0, limit - saved - pending);
}

export function moveImage(value, from, to) {
  const next = [...value];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Cola independiente de React: reserva como máximo tres solicitudes en vuelo.
// Los fallos/cancelaciones conservan su archivo para reintentar sin volver a elegirlo.
export function createImageUploadQueue(upload, { onUpdate, onUploaded }) {
  let jobs = [];
  let sequence = 0;
  let disposed = false;
  const active = new Map();
  const notify = () => {
    if (!disposed) onUpdate(jobs.map((job) => ({ ...job })), jobs.some((job) => job.status === 'queued' || job.status === 'uploading'));
  };
  function pump() {
    if (disposed) return;
    for (const job of jobs) {
      if (active.size >= 3) break;
      if (job.status !== 'queued' || active.has(job.id)) continue;
      const controller = new AbortController();
      active.set(job.id, controller);
      job.status = 'uploading';
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
        return upload(job.file, { signal: controller.signal, onProgress: (progress) => {
          if (disposed || controller.signal.aborted) return;
          job.progress = progress;
          notify();
        } });
      }).then((result) => {
        if (disposed || controller.signal.aborted) return;
        onUploaded(result);
        jobs = jobs.filter((item) => item !== job);
      }).catch((error) => {
        if (disposed || controller.signal.aborted) return;
        job.status = 'error';
        job.error = error;
      }).finally(() => {
        active.delete(job.id);
        if (!disposed) { pump(); notify(); }
      });
    }
    notify();
  }
  return {
    count: () => jobs.length,
    add(files) {
      if (disposed) return;
      jobs.push(...files.map((file) => ({ id: ++sequence, file, status: 'queued', progress: 0, error: null })));
      pump();
    },
    cancel(id) {
      const job = jobs.find((item) => item.id === id);
      if (!job) return;
      job.status = 'cancelled';
      active.get(id)?.abort();
      pump();
    },
    retry(id) {
      const job = jobs.find((item) => item.id === id);
      if (!job || !['error', 'cancelled'].includes(job.status)) return;
      Object.assign(job, { status: 'queued', progress: 0, error: null });
      pump();
    },
    remove(id) {
      jobs = jobs.filter((job) => job.id !== id);
      active.get(id)?.abort();
      pump();
    },
    dispose() {
      disposed = true;
      active.forEach((controller) => controller.abort());
      jobs = [];
    },
  };
}
