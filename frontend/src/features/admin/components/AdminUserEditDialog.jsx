import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';
import { saveUserChanges } from '../services/usersService.js';
import { canAssignUserRole, userEditChanges, userEditDraft, userFieldErrors, userRequestError, validateUserEditDraft } from '../utils/users.js';

const inputClass = 'mt-2 w-full rounded-lg border border-[#dfe5ec] px-3 py-2.5 text-sm disabled:bg-[#f3f6fa] disabled:text-[#626b79]';

export function AdminUserEditDialog({ user, roles, actor, token, onSaved, onClose }) {
  const dialog = useRef(null);
  const summary = useRef(null);
  const inFlight = useRef(false);
  const [baseline, setBaseline] = useState(user);
  const [draft, setDraft] = useState(() => userEditDraft(user));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const own = String(user.id) === String(actor.id);
  const changes = userEditChanges(draft, baseline);
  const dirty = Object.keys(changes.data).length > 0 || changes.role_id !== undefined;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    element.querySelector('input')?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(''); setNotice('');
  }

  async function save() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage(''); setNotice('');
    try {
      const result = await saveUserChanges(baseline, userEditChanges(draft, baseline), token);
      setBaseline(result.user);
      let warning = '';
      if (result.completed.length) warning = await onSaved(result.user) || '';
      if (result.failed) {
        if (result.completed.includes('data')) {
          setDraft((current) => ({ ...current, name: result.user.name, active: result.user.active }));
        }
        setErrors(userFieldErrors(result.failed.error));
        const prefix = result.completed.length
          ? 'Los datos se guardaron, pero no se pudo confirmar el cambio de rol. '
          : result.failed.step === 'data'
            ? 'No se pudo confirmar el cambio de datos. No se intentó cambiar el rol. '
            : 'No se pudo confirmar el cambio de rol. ';
        setMessage(prefix + userRequestError(result.failed.error));
        requestAnimationFrame(() => summary.current?.focus());
      } else {
        setDraft(userEditDraft(result.user));
        setNotice(warning || 'Cambios guardados.');
      }
    } finally {
      setConfirm(false); inFlight.current = false; setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (inFlight.current || !dirty) return;
    const validation = validateUserEditDraft(draft, baseline, roles, actor);
    setErrors(validation); setMessage(''); setNotice('');
    if (Object.keys(validation).length) {
      document.getElementById(`edit-user-${Object.keys(validation)[0]}`)?.focus();
      return;
    }
    if (changes.data.active === false) setConfirm(true);
    else void save();
  }

  return <>
    <dialog ref={dialog} aria-labelledby="edit-user-title" aria-describedby="edit-user-description" aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-[#12233f] shadow-xl backdrop:bg-[#09172b]/70">
      <h2 id="edit-user-title" className="text-2xl font-semibold">Editar usuario</h2>
      <p id="edit-user-description" className="mt-2 break-words text-sm text-[#626b79]">{user.email}</p>
      {own && <p className="mt-4 rounded-lg bg-[#edf2f8] p-3 text-sm">Puedes editar tu nombre. No puedes cambiar tu propio rol ni desactivarte.</p>}
      {message && <div ref={summary} role="alert" tabIndex={-1} className="mt-4 rounded-lg bg-[#fff4f4] p-3 text-sm text-[#a62b2b]">{message}</div>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-[#eaf6ef] p-3 text-sm text-[#1f704a]">{notice}</p>}
      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={busy || confirm} className="space-y-5">
          <legend className="sr-only">Datos del usuario</legend>
          <div><label htmlFor="edit-user-name" className="text-sm font-semibold">Nombre completo</label>
            <input id="edit-user-name" required maxLength={120} value={draft.name} onChange={(event) => update('name', event.target.value)} className={inputClass}
              aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'edit-user-name-error' : undefined}/>
            {errors.name && <p id="edit-user-name-error" className="mt-2 text-sm text-[#a62b2b]">{errors.name}</p>}</div>
          <div><label htmlFor="edit-user-role_id" className="text-sm font-semibold">Rol asignado</label>
            <select id="edit-user-role_id" disabled={own} value={draft.role_id} onChange={(event) => update('role_id', event.target.value)} className={inputClass}
              aria-invalid={Boolean(errors.role_id)} aria-describedby="edit-user-role-help edit-user-role-error">
              <option value="">Conservar roles actuales: {baseline.roles.map((role) => role.name).join(', ') || 'Sin rol'}</option>
              {baseline.roles.length === 1 && !roles.some((role) => role.id === baseline.roles[0].id) &&
                <option value={baseline.roles[0].id} disabled>{baseline.roles[0].name} (no disponible)</option>}
              {roles.filter((role) => role.active).map((role) => <option key={role.id} value={role.id} disabled={!canAssignUserRole(role, actor)}>{role.name}</option>)}
            </select>
            <p id="edit-user-role-help" className="mt-2 text-xs text-[#626b79]">Elegir otro rol reemplaza todas las asignaciones anteriores. Solo puedes asignar permisos que posees.</p>
            <p id="edit-user-role-error" className="mt-2 text-sm text-[#a62b2b]">{errors.role_id}</p></div>
          <div><label className="flex items-center gap-3 text-sm font-semibold"><input id="edit-user-active" type="checkbox" disabled={own} checked={draft.active} onChange={(event) => update('active', event.target.checked)}
            aria-invalid={Boolean(errors.active)} aria-describedby={errors.active ? 'edit-user-active-error' : undefined}/> Cuenta activa</label>
            {errors.active && <p id="edit-user-active-error" className="mt-2 text-sm text-[#a62b2b]">{errors.active}</p>}</div>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3 border-t border-[#dfe5ec] pt-5">
          <button type="button" disabled={busy || confirm} onClick={onClose} className="rounded-lg border border-[#dfe5ec] px-4 py-2 text-sm">Cerrar</button>
          <LoadingButton type="submit" loading={busy} disabled={!dirty || confirm}>Guardar cambios</LoadingButton>
        </div>
      </form>
    </dialog>
    <ConfirmDialog open={confirm} title="Desactivar cuenta" description={`¿Desactivar la cuenta de ${baseline.name}? No podrá iniciar sesión mientras permanezca inactiva.`}
      confirmLabel="Desactivar" destructive busy={busy} onConfirm={() => { void save(); }} onCancel={() => setConfirm(false)}/>
  </>;
}
