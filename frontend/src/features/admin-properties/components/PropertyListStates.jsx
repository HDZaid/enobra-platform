// Estados de carga, vacío y error del listado. Locales a este módulo hasta que
// el kit compartido de Leo (FE-01a) esté en frontend-dev; entonces se reemplazan.
import { Building2 } from 'lucide-react';

export function PropertyTableSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="divide-y divide-[#dfe5ec]">
      <span className="sr-only">Cargando propiedades…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex animate-pulse items-center gap-4 px-5 py-4">
          <div className="size-16 shrink-0 rounded-lg bg-[#e6ebf2]" />
          <div className="flex-1 space-y-2"><div className="h-4 w-1/2 rounded bg-[#e6ebf2]" /><div className="h-3 w-1/3 rounded bg-[#eef2f7]" /></div>
          <div className="hidden h-4 w-24 rounded bg-[#e6ebf2] sm:block" />
        </div>
      ))}
    </div>
  );
}

export function PropertyEmpty({ filtered, onClear, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Building2 size={36} className="text-[#9aa6b8]" aria-hidden="true" />
      <p className="mt-3 font-semibold">{filtered ? 'Ninguna propiedad coincide con los filtros' : 'Aún no hay propiedades'}</p>
      <p className="mt-1 max-w-[380px] text-sm text-[#626b79]">
        {filtered ? 'Prueba con otra búsqueda o limpia los filtros.' : 'Cuando se publique o guarde la primera, aparecerá aquí.'}
      </p>
      {filtered
        ? <button type="button" onClick={onClear} className="mt-4 text-xs font-semibold text-[#b94308] underline">Limpiar filtros</button>
        : action}
    </div>
  );
}

export function PropertyError({ message, onRetry }) {
  return (
    <div role="alert" className="p-6 text-sm text-[#9c2929]">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#dfe5ec] px-4 py-2 text-xs font-semibold text-[#304e7d]">Reintentar consulta</button>
    </div>
  );
}
