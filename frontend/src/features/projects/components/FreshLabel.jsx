import { CircleAlert, LoaderCircle } from 'lucide-react';

// Etiqueta de un catálogo que solo muestra su valor cuando la API lo confirmó.
// Con datos guardados muestra un indicador de carga, y una alerta si no se pudo confirmar.
export function FreshLabel({ freshness = 'fresh', children }) {
  if (freshness === 'fresh') return children;
  if (freshness === 'confirming')
    return (
      <span className="geo-fresh-label" title="Confirmando con el servidor">
        <LoaderCircle className="geo-fresh-spin" aria-hidden="true" />
        <span className="sr-only">Confirmando</span>
      </span>
    );
  return (
    <span className="geo-fresh-label" title="No pudimos confirmar con el servidor">
      <CircleAlert aria-hidden="true" />
      Sin confirmar
    </span>
  );
}

// Aviso único por pantalla para lectores de pantalla y para quien no vea el icono.
export function FreshNotice({ freshness, message, onRetry }) {
  if (freshness === 'fresh') return null;
  return (
    <p className="small muted geo-fresh-notice" role="status" aria-live="polite">
      {message}
      {freshness === 'unconfirmed' && onRetry && (
        <>
          {' '}
          <button type="button" className="text-link" onClick={onRetry}>
            Reintentar
          </button>
        </>
      )}
    </p>
  );
}
