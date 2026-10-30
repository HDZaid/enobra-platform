import { useEffect, useId, useRef, useState } from 'react';
import { Clock3, LockKeyhole } from 'lucide-react';

export function SessionNotification({ state, email, onContinue, onReauthenticate, onLogout }) {
  if (state.status === 'expired') return <ExpiredSession {...{ email, onReauthenticate, onLogout }} />;
  if (state.status !== 'warning') return null;
  const time = `${Math.floor(state.seconds / 60)}:${String(state.seconds % 60).padStart(2, '0')}`;
  return <aside aria-label="Aviso de vencimiento de sesión" className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-amber-200 bg-white p-5 text-[#12233f] shadow-xl sm:right-6 sm:bottom-6">
    <div className="flex items-start gap-3"><Clock3 aria-hidden="true" className="mt-1 shrink-0 text-amber-700" size={23} />
      <div><p role="status" className="font-semibold">Tu sesión está por vencer</p>
        <p className="mt-2 text-sm text-[#626b79]">Continúa usando el panel para mantenerla activa.</p>
        <p className="mt-3 text-2xl font-semibold tabular-nums" role="timer" aria-label="Tiempo restante de sesión">{time}</p>
      </div>
    </div>
    {state.error && <p className="mt-3 text-sm text-[#a62b2b]" role="status">{state.error}</p>}
    <button type="button" onClick={onContinue} disabled={state.renewing} className="mt-4 w-full rounded-lg bg-[#304e7d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{state.renewing ? 'Renovando…' : 'Seguir trabajando'}</button>
  </aside>;
}

function ExpiredSession({ email, onReauthenticate, onLogout }) {
  const dialog = useRef(null);
  const passwordInput = useRef(null);
  const id = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    passwordInput.current?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await onReauthenticate({ email, password }); }
    catch (failure) { setError(failure?.status === 401 ? 'Contraseña incorrecta.' : failure?.status === 429 ? 'Demasiados intentos. Espera un minuto.' : failure?.message || 'No se pudo iniciar sesión.'); setPassword(''); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby={`${id}-title`} onCancel={(event) => event.preventDefault()}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-[#12233f] shadow-2xl backdrop:bg-[#09172b]/70">
    <LockKeyhole aria-hidden="true" size={28} className="text-[#b94308]" />
    <h2 id={`${id}-title`} className="mt-3 text-xl font-semibold">Tu sesión terminó</h2>
    <p className="mt-2 text-sm text-[#626b79]">Vuelve a entrar para continuar. Tu formulario se conserva mientras mantengas esta pestaña abierta; los cambios pendientes aún no están guardados.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm">Correo electrónico<input value={email} readOnly autoComplete="username" type="email" className="mt-1 w-full rounded-lg border border-[#dfe5ec] bg-[#f3f6fa] p-3" /></label>
      <label className="block text-sm">Contraseña<input ref={passwordInput} value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" disabled={busy} className="mt-1 w-full rounded-lg border border-[#dfe5ec] p-3" /></label>
      {error && <p role="alert" className="text-sm text-[#a62b2b]">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#304e7d] p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Volver a entrar'}</button>
      <button type="button" disabled={busy} onClick={onLogout} className="w-full rounded-lg border border-[#dfe5ec] p-3 text-sm">Salir del panel</button>
    </form>
  </dialog>;
}
