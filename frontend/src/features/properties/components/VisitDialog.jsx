import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { requestVisit, todayLocal, validateVisit } from '../services/visitService.js';

export function VisitDialog({ property, onClose }) {
  const dialog = useRef(null);
  const request = useRef(null);
  const sending = useRef(false);
  const [values, setValues] = useState({ name: '', phone: '', preferred_date: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      request.current?.abort();
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (sending.current) return;
    const invalid = validateVisit(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      dialog.current.querySelector(`[name="${Object.keys(invalid)[0]}"]`)?.focus();
      return;
    }
    sending.current = true;
    setStatus('sending');
    setMessage('');
    request.current = new AbortController();
    try {
      await requestVisit(property.id, values, { signal: request.current.signal });
      if (!request.current.signal.aborted) {
        setStatus('success');
        setMessage(
          'Recibimos tu solicitud. Nos pondremos en contacto contigo para coordinar la visita.',
        );
      }
    } catch (error) {
      if (request.current.signal.aborted) return;
      setStatus('error');
      const fields = {};
      for (const key of Object.keys(values)) {
        const detail = error.details?.[key];
        if (typeof detail === 'string' || Array.isArray(detail))
          fields[key] = Array.isArray(detail) ? detail.join(' ') : detail;
      }
      setErrors(fields);
      setMessage(
        error.status === 501
          ? 'Las solicitudes de visita aún no están disponibles. Tu solicitud no fue enviada.'
          : 'No pudimos confirmar tu solicitud. Inténtalo de nuevo o contáctanos.',
      );
    } finally {
      sending.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      className="geo-visit-dialog"
      aria-labelledby="visit-title"
      onCancel={onClose}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <button
        className="icon-button geo-dialog-close"
        aria-label="Cerrar solicitud"
        onClick={onClose}
      >
        <X />
      </button>
      <p className="eyebrow">SOLICITUD DE VISITA</p>
      <h2 id="visit-title">{property.title}</h2>
      {property.demo && <p className="small muted">Esta propiedad está marcada como ejemplo.</p>}
      {status === 'success' ? (
        <>
          <p role="status">{message}</p>
          <button className="button primary" onClick={onClose}>
            Entendido
          </button>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <div role="alert">{message}</div>
          {[
            ['name', 'Nombre', 'text', 'name'],
            ['phone', 'Teléfono', 'tel', 'tel-national'],
            ['preferred_date', 'Fecha preferida', 'date', 'off'],
          ].map(([name, label, type, autoComplete]) => (
            <label key={name} htmlFor={`visit-${name}`}>
              <span id={`visit-${name}-label`}>{label} *</span>
              <input
                id={`visit-${name}`}
                name={name}
                type={type}
                autoComplete={autoComplete}
                min={type === 'date' ? todayLocal() : undefined}
                maxLength={name === 'name' ? 120 : undefined}
                required
                disabled={status === 'sending'}
                value={values[name]}
                onChange={(e) => {
                  setValues({ ...values, [name]: e.target.value });
                  setErrors((previous) => ({ ...previous, [name]: undefined }));
                }}
                aria-labelledby={`visit-${name}-label`}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `visit-${name}-error` : undefined}
              />
              <span className="geo-field-error" id={`visit-${name}-error`}>
                {errors[name]}
              </span>
            </label>
          ))}
          <p className="small muted">La fecha está sujeta a confirmación por nuestro equipo.</p>
          <button className="button primary" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Enviando…' : 'Solicitar visita →'}
          </button>
        </form>
      )}
    </dialog>
  );
}
