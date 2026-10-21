import { useEffect, useState } from 'react';

// Reference content stays visible while loading and on failure; never represents a saved API result.
export function useReferenceResource(loader, reference) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: reference, status: 'loading', error: null });
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('Tiempo de espera agotado')),
      10000,
    );
    let active = true;
    setState({ data: reference, status: 'loading', error: null });
    loader({ signal: controller.signal })
      .then((data) => {
        if (active) setState({ data, status: 'ready', error: null });
      })
      .catch((error) => {
        if (active) setState({ data: reference, status: 'reference', error });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loader, reference, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
