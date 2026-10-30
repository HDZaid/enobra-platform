import { BrokenArchMark } from './ColonialOrnaments.jsx';
import { useSignage } from './signage.js';

export function ContentStatus({ resource }) {
  const signage = useSignage();
  if (resource.status === 'ready') return null;
  return (
    <div className="leo-content-status" role="status" aria-live="polite">
      {resource.status === 'loading' ? (
        'Actualizando información…'
      ) : (
        <>
          {signage && <BrokenArchMark />}
          {resource.error?.status === 501
            ? 'Información en línea aún no disponible.'
            : 'No se pudo actualizar la información.'}{' '}
          Mostramos el contenido de referencia.{' '}
          <button type="button" onClick={resource.retry}>
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
