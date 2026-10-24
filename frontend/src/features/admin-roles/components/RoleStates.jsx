import { useEffect, useRef } from 'react';

export function RoleLoading() {
  return <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-[#dfe5ec] bg-white p-6">
    <p className="text-sm text-[#626b79]">Cargando roles y permisos…</p>
    <div aria-hidden="true" className="mt-5 space-y-3 animate-pulse">{[1, 2, 3].map((id) => <div key={id} className="h-12 rounded-lg bg-[#edf2f8]"/>)}</div>
  </div>;
}

export function RoleError({ message, retry }) {
  return <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff4f4] p-5 text-sm text-[#a62b2b]">
    <p>{message}</p>{retry && <button type="button" onClick={retry} className="mt-3 rounded-lg border border-current px-4 py-2 font-semibold">Reintentar</button>}
  </div>;
}

export function UnsavedRoleDialog({ blocker, busy }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="unsaved-role-title" aria-describedby="unsaved-role-description"
    onCancel={(event) => { event.preventDefault(); blocker.reset(); }}
    className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-6 text-[#12233f] shadow-2xl backdrop:bg-[#09172b]/70">
    <h2 id="unsaved-role-title" className="text-xl font-semibold">Hay cambios sin guardar</h2>
    <p id="unsaved-role-description" className="mt-3 text-sm text-[#626b79]">{busy ? 'Espera a que termine la operación antes de salir.' : 'Si sales ahora, perderás los cambios de este rol.'}</p>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus onClick={() => blocker.reset()} className="rounded-lg border border-[#dfe5ec] px-4 py-2 text-sm font-semibold">Seguir editando</button>
      <button type="button" disabled={busy} onClick={() => blocker.proceed()} className="rounded-lg bg-[#a62b2b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salir sin guardar</button>
    </div>
  </dialog>;
}
