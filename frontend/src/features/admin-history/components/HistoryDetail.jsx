import { useEffect, useId, useRef } from 'react';
import { actionLabel, formatHistoryDate, moduleLabel } from '../utils/history.js';
import { LoadingButton } from '../../../components/ui/LoadingButton.jsx';

export function HistoryDetail({ item, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-[#12233f] shadow-xl backdrop:bg-[#09172b]/70">
    <h3 id={id} className="text-xl font-semibold">Detalle del evento</h3>
    <dl className="my-5 grid gap-3 text-sm">
      {Object.entries({ Fecha: formatHistoryDate(item.date), Usuario: item.user.name, Módulo: moduleLabel(item.module), Acción: actionLabel(item.action), Registro: item.record_name || 'Sin nombre', 'ID del registro': item.record_id ?? 'No disponible' }).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></div>)}
      <div><dt className="font-semibold">Descripción</dt><dd className="whitespace-pre-wrap break-words">{item.description || 'Sin descripción'}</dd></div>
    </dl>
    <LoadingButton autoFocus variant="outline" onClick={onClose}>Cerrar</LoadingButton>
  </dialog>;
}
