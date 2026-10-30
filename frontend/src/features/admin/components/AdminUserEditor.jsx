import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, UserPlus, X } from 'lucide-react';
import { emptyUserDraft, makeUserPayload, userFieldErrors, userRequestError, validateUserDraft } from '../utils/users.js';

const inputClass = 'mt-1.5 w-full rounded-lg border border-[#dfe5ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#304e7d] focus:ring-2 focus:ring-[#304e7d]/15 disabled:bg-[#f3f6fa]';

export function AdminUserEditor({ roles, preview, onClose, onCreate }) {
  const dialog = useRef(null);
  const firstError = useRef(null);
  const inFlight = useRef(false);
  const [draft, setDraft] = useState(emptyUserDraft);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const role = roles.find((item) => String(item.id) === draft.role_id);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    element.querySelector('#user-name')?.focus();
    return () => element.close();
  }, []);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setRequestError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const validation = validateUserDraft(draft, roles);
    setErrors(validation);
    setRequestError('');
    if (Object.keys(validation).length) {
      document.getElementById(`user-${Object.keys(validation)[0]}`)?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      await onCreate(makeUserPayload(draft));
    } catch (error) {
      setErrors(userFieldErrors(error));
      setRequestError(userRequestError(error));
      firstError.current?.focus();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function field(key, label, options = {}) {
    const error = errors[key];
    return <div><label htmlFor={`user-${key}`} className="block text-xs font-semibold text-[#304057]">{label} <span aria-hidden="true" className="text-[#b94308]">*</span></label>
      <input id={`user-${key}`} name={key} value={draft[key]} onChange={(event) => update(key, event.target.value)}
        required disabled={busy} className={`${inputClass} ${key === 'password' ? 'pr-10' : ''}`} aria-invalid={Boolean(error)}
        aria-describedby={error ? `user-${key}-error` : options['aria-describedby']} {...options}/>
      {error && <p id={`user-${key}-error`} className="mt-1 text-xs text-[#a62b2b]">{error}</p>}</div>;
  }

  return <dialog ref={dialog} aria-labelledby="user-editor-title" aria-describedby="user-editor-description"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[680px] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-[#12233f] shadow-2xl backdrop:bg-[#09172b]/70">
    <div className="flex items-start justify-between gap-4 border-b border-[#dfe5ec] px-6 py-5 sm:px-8">
      <div><span className="text-[10px] font-bold tracking-[.16em] text-[#b94308] uppercase">Administración de accesos</span>
        <h2 id="user-editor-title" className="mt-1 font-['Montserrat',Arial,sans-serif] text-2xl font-semibold">Crear usuario</h2>
        <p id="user-editor-description" className="mt-2 text-sm text-[#626b79]">Completa los datos y asigna un rol a la nueva cuenta.</p></div>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar formulario" className="rounded-lg p-2 text-[#626b79] hover:bg-[#f3f6fa] disabled:opacity-40"><X size={20}/></button>
    </div>
    <form onSubmit={submit} noValidate className="px-6 py-6 sm:px-8">
      {requestError && <div ref={firstError} tabIndex={-1} role="alert" className="mb-5 rounded-lg border border-[#f1cccc] bg-[#fff4f4] p-3 text-sm text-[#a62b2b]">{requestError}</div>}
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <legend className="sr-only">Datos de la cuenta</legend>
        <div className="sm:col-span-2">{field('name', 'Nombre completo', { maxLength: 120, autoComplete: 'name' })}</div>
        <div className="sm:col-span-2">{field('email', 'Correo electrónico', { type: 'email', maxLength: 150, autoComplete: 'off', autoCapitalize: 'none', spellCheck: false })}</div>
        <div className="relative">{field('password', 'Contraseña', { type: showPassword ? 'text' : 'password', minLength: 10, maxLength: 128, autoComplete: 'new-password', 'aria-describedby': 'user-password-help' })}
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute top-7 right-2 rounded bg-white p-1 text-[#626b79]">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          <p id="user-password-help" className="mt-2 text-xs leading-relaxed text-[#626b79]">Mínimo 10 caracteres. Evita contraseñas comunes, solo números o tus datos personales.</p></div>
        {field('confirmation', 'Confirmar contraseña', { type: showPassword ? 'text' : 'password', maxLength: 128, autoComplete: 'new-password' })}
        <div className="sm:col-span-2"><label htmlFor="user-role_id" className="text-xs font-semibold text-[#304057]">Rol asignado <span aria-hidden="true" className="text-[#b94308]">*</span></label>
          <select id="user-role_id" value={draft.role_id} onChange={(event) => update('role_id', event.target.value)} required className={inputClass}
            aria-invalid={Boolean(errors.role_id)} aria-describedby={errors.role_id ? 'user-role_id-error' : 'user-role-help'}>
            <option value="">Selecciona un rol</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {errors.role_id && <p id="user-role_id-error" className="mt-1 text-xs text-[#a62b2b]">{errors.role_id}</p>}
          <p id="user-role-help" className="mt-2 flex items-start gap-2 rounded-lg bg-[#f3f6fa] p-3 text-xs leading-relaxed text-[#626b79]"><ShieldCheck size={16} className="shrink-0 text-[#304e7d]"/>{role?.description || 'El rol determina las secciones y acciones disponibles para esta cuenta.'}</p></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dfe5ec] p-4 sm:col-span-2"><input type="checkbox" checked={draft.active} onChange={(event) => update('active', event.target.checked)} className="mt-1 size-4 accent-[#304e7d]"/>
          <span><strong className="block text-sm font-semibold">Cuenta activa</strong><span className="mt-1 block text-xs text-[#626b79]">{draft.active ? 'Podrá iniciar sesión con su correo y contraseña.' : 'No podrá iniciar sesión mientras permanezca inactiva.'}</span></span></label>
      </fieldset>
      {preview && <p className="mt-5 rounded-lg bg-[#fff1e5] p-3 text-xs text-[#88420d]">Demostración: no se creará una cuenta real ni se conservará la contraseña.</p>}
      <div className="mt-6 flex justify-end gap-3 border-t border-[#dfe5ec] pt-5">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-[#dfe5ec] px-5 py-2.5 text-sm font-semibold disabled:opacity-40">Cancelar</button>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6a1f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b94308] disabled:opacity-50"><UserPlus size={17}/>{busy ? 'Creando…' : preview ? 'Crear referencia' : 'Crear usuario'}</button>
      </div>
    </form>
  </dialog>;
}
