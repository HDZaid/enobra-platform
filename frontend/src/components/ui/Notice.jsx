// <Notice type="success" onClose={() => setNotice('')}>Cambios guardados.</Notice>
import { X } from 'lucide-react';

const colors = {
  success: 'border-[#bce0ce] bg-[#eaf6ef] text-[#1f704a]',
  error: 'border-[#f1cccc] bg-[#fff4f4] text-[#a62b2b]',
  info: 'border-[#dfe5ec] bg-[#f3f6fa] text-[#304e7d]',
};

export function Notice({ type = 'info', onClose, children }) {
  return <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-sm ${colors[type] || colors.info}`}>
    <div>{children}</div>
    {onClose && <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="shrink-0 rounded p-1 focus-visible:outline-2 focus-visible:outline-offset-2"><X size={18} aria-hidden="true" /></button>}
  </div>;
}
