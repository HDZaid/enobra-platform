export function ContentStatus({ resource }) {
  if (resource.status === 'ready') return null;
  return (
    <div className="leo-content-status" role="status" aria-live="polite">
      {resource.status === 'loading' ? (
        'Actualizando información…'
      ) : (
        <>
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
