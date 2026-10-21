import { useEffect, useState } from 'react';

// Key each request so a previous route/filter can never paint over the current one.
export function useCatalogResource(loader, key) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    loader(key, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, attempt, status: 'ready', data });
      },
      (error) => {
        if (!controller.signal.aborted) setState({ key, attempt, status: 'error', error });
      },
    );
    return () => controller.abort();
  }, [loader, key, attempt]);
  const current = state.key === key && state.attempt === attempt ? state : { status: 'loading' };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
