import { ArrowLeft, ArrowRight } from 'lucide-react';

export function CatalogStatus({ resource, notFound = 'Contenido no encontrado' }) {
  if (resource.status === 'ready') return null;
  const missing = resource.error?.status === 404;
  return (
    <div className="geo-status" role="status" aria-live="polite">
      <h2>
        {resource.status === 'loading'
          ? 'Cargando…'
          : missing
            ? notFound
            : 'No pudimos cargar la información'}
      </h2>
      {resource.status === 'error' && (
        <>
          <p>
            {missing
              ? 'El contenido no existe o ya no está publicado.'
              : resource.error?.status === 501
                ? 'Este contenido todavía no está disponible en línea. Inténtalo más tarde.'
                : 'Revisa tu conexión e inténtalo nuevamente.'}
          </p>
          {!missing && (
            <button className="text-link" onClick={resource.retry}>
              Reintentar <ArrowRight aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function Pagination({ data, onPage }) {
  const total = Math.max(1, Math.ceil(data.count / data.page_size));
  if (total === 1 && data.page === 1) return null;
  return (
    <nav className="geo-pagination" aria-label="Paginación">
      <button
        className="button outline"
        disabled={data.page <= 1}
        onClick={() => onPage(data.page - 1)}
      >
        <ArrowLeft aria-hidden="true" /> Anterior
      </button>
      <span>
        Página {data.page} de {total}
      </span>
      <button
        className="button outline"
        disabled={data.page >= total}
        onClick={() => onPage(data.page + 1)}
      >
        Siguiente <ArrowRight aria-hidden="true" />
      </button>
    </nav>
  );
}
