import { useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { contactService } from '../services/contactService.js';
import {
  buildContactPayload,
  CONTACT_SUBJECTS,
  getContactSubject,
  validateContact,
} from '../services/contactValidation.js';

const inputClass = 'mt-2 block w-full min-w-0 rounded-[2px] border border-[#cdd5df] bg-white px-3 py-3 text-sm text-[#12233f] outline-none transition-colors placeholder:text-[#6b7280] focus:border-[#304e7d] focus:ring-3 focus:ring-[#304e7d]/10 aria-invalid:border-[#b42318] aria-invalid:focus:ring-[#b42318]/10';
const labelClass = 'block text-xs font-semibold text-[#12233f]';
const EMPTY = { name: '', email: '', phone: '', subject: 'Diseño', message: '', website: '' };

function Field({ name, label, value, error, onChange, type = 'text', autoComplete, maxLength, inputMode }) {
  return (
    <div className="min-w-0">
      <label className={labelClass} htmlFor={`contact-${name}`}>{label} *</label>
      <input
        id={`contact-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required
        className={inputClass}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `contact-${name}-error` : undefined}
      />
      {error && <p id={`contact-${name}-error`} className="mt-1 text-xs text-[#b42318]">{error}</p>}
    </div>
  );
}

export function ContactForm() {
  const { search } = useLocation();
  const [values, setValues] = useState({ ...EMPTY, subject: getContactSubject(search) });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setValues((current) => ({ ...current, subject: getContactSubject(search) }));
    setErrors((current) => ({ ...current, subject: undefined }));
  }, [search]);

  function update(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    if (status.message) setStatus({ type: '', message: '' });
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const validationErrors = validateContact(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const first = Object.keys(validationErrors)[0];
      if (first !== 'website') event.currentTarget.elements.namedItem(first)?.focus();
      else setStatus({ type: 'error', message: 'La solicitud no puede procesarse.' });
      return;
    }

    setSending(true);
    setStatus({ type: '', message: '' });
    try {
      await contactService.send(buildContactPayload(values));
      setStatus({ type: 'success', message: 'Tu solicitud fue recibida correctamente.' });
      setValues({ ...EMPTY, subject: values.subject });
      setErrors({});
    } catch (error) {
      const message = error?.status === 501 || error?.code === 'not_implemented'
        ? 'El formulario todavía no puede guardar solicitudes. No se envió ningún mensaje.'
        : error?.status === 429
          ? 'Se alcanzó el límite de solicitudes. Intenta de nuevo más tarde.'
          : 'No fue posible enviar tu consulta. Intenta más tarde o comunícate por teléfono.';
      setStatus({ type: 'error', message });
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="border-t-[3px] border-[#ff6a1f] bg-white p-6 shadow-[0_14px_45px_rgba(18,35,63,0.06)] sm:p-9"
      aria-label="Formulario de contacto"
    >
      {status.message && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`mb-6 rounded-sm border-l-4 p-4 text-sm leading-relaxed ${status.type === 'success'
            ? 'border-[#215633] bg-[#e4f2e8] text-[#215633]'
            : 'border-[#b42318] bg-[#fff0ee] text-[#9d261c]'}`}
        >
          {status.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-x-[18px] gap-y-5 sm:grid-cols-2">
        <Field name="name" label="Nombre" value={values.name} error={errors.name}
          onChange={update} autoComplete="name" maxLength={120} />
        <Field name="email" label="Correo electrónico" type="email" value={values.email}
          error={errors.email} onChange={update} autoComplete="email" maxLength={254} />
        <Field name="phone" label="Teléfono" type="tel" value={values.phone}
          error={errors.phone} onChange={update} autoComplete="tel-national" inputMode="tel" />
        <div className="min-w-0">
          <label className={labelClass} htmlFor="contact-subject">Tipo de consulta *</label>
          <select id="contact-subject" name="subject" required value={values.subject}
            onChange={update} className={inputClass} aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? 'contact-subject-error' : undefined}>
            {CONTACT_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          {errors.subject && <p id="contact-subject-error" className="mt-1 text-xs text-[#b42318]">{errors.subject}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="contact-message">Mensaje *</label>
          <textarea id="contact-message" name="message" value={values.message} onChange={update}
            required maxLength={2000} rows={5} className={inputClass}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'contact-message-error' : undefined} />
          <p className="mt-1 text-right text-xs text-[#626b79]">{values.message.length}/2000 caracteres</p>
          {errors.message && <p id="contact-message-error" className="mt-1 text-xs text-[#b42318]">{errors.message}</p>}
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">No completar</label>
          <input id="contact-website" name="website" value={values.website} onChange={update}
            autoComplete="off" tabIndex={-1} />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-5 text-xs leading-relaxed text-[#626b79]">
            Revisaremos tu consulta para dar seguimiento a tu solicitud.
            El formulario solo confirmará el envío cuando el servidor responda correctamente.
          </p>
          <button type="submit" disabled={sending}
            className="inline-flex min-h-[50px] cursor-pointer items-center justify-between gap-7 rounded-[3px] bg-[#ff6a1f] px-6 py-3 text-sm font-bold text-[#12233f] transition-colors hover:bg-[#ff8a50] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#304e7d] disabled:cursor-wait disabled:opacity-70">
            {sending ? <><LoaderCircle className="h-[19px] w-[19px] animate-spin" aria-hidden="true" /> Enviando…</>
              : <>Enviar consulta <ArrowRight className="h-[19px] w-[19px]" aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </form>
  );
}
