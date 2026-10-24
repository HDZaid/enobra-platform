// <ConfirmDialog open={open} title="Eliminar definitivamente" description="No se puede deshacer." confirmLabel="Eliminar" destructive requireText="Casa en Zona 9" busy={busy} onConfirm={remove} onCancel={close} />
import { useEffect, useId, useRef, useState } from 'react';
import { LoadingButton } from './LoadingButton.jsx';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', destructive = false, requireText, busy = false, onConfirm, onCancel }) {
  // Desmontar el contenido borra la confirmación al cerrar o cambiar de registro.
  return open ? <Confirmation key={`${title}:${requireText ?? ''}`} {...{ title, description, confirmLabel, destructive, requireText, busy, onConfirm, onCancel }} /> : null;
}

function Confirmation({ title, description, confirmLabel, destructive, requireText, busy, onConfirm, onCancel }) {
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const id = useId();
  const [text, setText] = useState('');
  const needsText = typeof requireText === 'string';
  const matches = !needsText || text === requireText;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    cancelButton.current?.focus();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);

  return <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-[#12233f] shadow-xl backdrop:bg-[#09172b]/70">
    <h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2>
    <p id={`${id}-description`} className="mt-3 text-sm text-[#626b79]">{description}</p>
    {needsText && <div className="mt-5">
      <label htmlFor={`${id}-text`} className="block break-words text-sm">Escribe exactamente «{requireText}» para confirmar.</label>
      <input id={`${id}-text`} value={text} onChange={(event) => setText(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false}
        className="mt-2 w-full rounded-lg border border-[#dfe5ec] px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#304e7d]" />
    </div>}
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button ref={cancelButton} type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-[#dfe5ec] px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Cancelar</button>
      <LoadingButton loading={busy} disabled={!matches} variant={destructive ? 'danger' : 'primary'} onClick={() => { if (!busy && matches) onConfirm(); }}>{confirmLabel}</LoadingButton>
    </div>
  </dialog>;
}
