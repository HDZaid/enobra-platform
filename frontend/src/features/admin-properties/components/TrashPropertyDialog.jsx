import { useEffect, useRef } from 'react';

// Confirmación para enviar a la papelera (restaurable, no es borrado definitivo).
export function TrashPropertyDialog({ item, busy, onCancel, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (item && element && !element.open) element.showModal();
    if (!item && element?.open) element.close();
  }, [item]);
  if (!item) return null;
  return (
    <dialog ref={dialog} aria-labelledby="trash-property-title" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
      className="m-auto w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-xl backdrop:bg-[#09172b]/70">
      <h3 id="trash-property-title" className="text-xl font-semibold">¿Enviar a la papelera?</h3>
      <p className="mt-3 text-sm text-[#626b79]">«{item.title}» dejará de verse en el sitio. Podrás restaurarla desde la papelera si tu rol lo permite.</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" autoFocus disabled={busy} onClick={onCancel} className="rounded-lg border border-[#dfe5ec] px-4 py-2 text-sm disabled:opacity-50">Cancelar</button>
        <button type="button" disabled={busy} onClick={onConfirm} className="rounded-lg bg-[#b64242] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enviando…' : 'Enviar a la papelera'}</button>
      </div>
    </dialog>
  );
}
