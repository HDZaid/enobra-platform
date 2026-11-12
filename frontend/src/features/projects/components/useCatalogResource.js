import { useEffect, useState } from 'react';

// Key each request so a previous route/filter can never paint over the current one.
// `fallback(key)` (opcional) entrega datos guardados mientras responde la API: se muestran con
// `stale: true` y la respuesta real los reemplaza. Si la API falla y hay datos guardados, se
// conservan; un 404 real sí se muestra (la publicación ya no existe o se retiró).
export function useCatalogResource(loader, key, fallback) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    let fresh = false;
    const current = (previous) => previous.key === key && previous.attempt === attempt;
    if (fallback) {
      Promise.resolve()
        .then(() => fallback(key))
        .then(
          (data) => {
            if (data == null || fresh || controller.signal.aborted) return;
            setState((previous) =>
              current(previous) && previous.status === 'ready'
                ? previous
                : { key, attempt, status: 'ready', data, stale: true },
            );
          },
          () => undefined,
        );
    }
    loader(key, { signal: controller.signal }).then(
      (data) => {
        fresh = true;
        if (!controller.signal.aborted) setState({ key, attempt, status: 'ready', data });
      },
      (error) => {
        fresh = true;
        if (controller.signal.aborted) return;
        setState((previous) =>
          current(previous) && previous.status === 'ready' && error?.status !== 404
            ? { ...previous, refreshError: error }
            : { key, attempt, status: 'error', error },
        );
      },
    );
    return () => controller.abort();
  }, [loader, key, attempt, fallback]);
  const current = state.key === key && state.attempt === attempt ? state : { status: 'loading' };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
