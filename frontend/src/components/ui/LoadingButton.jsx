// <LoadingButton loading={busy} loadingText="Guardando…" variant="primary" type="submit">Guardar</LoadingButton>
import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-[#304e7d] text-white hover:bg-[#12233f]',
  outline: 'border border-[#dfe5ec] bg-white text-[#304e7d] hover:bg-[#f3f6fa]',
  danger: 'bg-[#a62b2b] text-white hover:bg-[#842222]',
};

// El formulario debe establecer loading al iniciar su envío (incluido Enter).
export function LoadingButton({ loading = false, loadingText = 'Procesando…', variant = 'primary', type = 'button', disabled = false, children, className = '', onClick, ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading}
    onClick={(event) => { if (loading || disabled) { event.preventDefault(); return; } onClick?.(event); }}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#304e7d] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}>
    {loading && <LoaderCircle size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
    <span aria-live="polite">{loading ? loadingText : children}</span>
  </button>;
}
