import { isSnapshot, SNAPSHOT_PATH } from './catalogSnapshot.js';

// Caché local del catálogo público (solo datos publicados, nunca tokens ni datos del panel).
// Cada respuesta se guarda 7 días; al vencer se borra.
export const CACHE_PREFIX = 'enobra:catalog:v1:';
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createCatalogCache({
  storage = browserStorage(),
  now = () => Date.now(),
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  let purged = false;
  let snapshot;

  function purge() {
    if (purged || !storage) return;
    purged = true;
    try {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => {
        try {
          const entry = JSON.parse(storage.getItem(key));
          if (!(now() - entry?.at < CACHE_MAX_AGE)) storage.removeItem(key);
        } catch {
          storage.removeItem(key);
        }
      });
    } catch {
      // Almacenamiento bloqueado: se trabaja sin caché.
    }
  }

  function read(name) {
    purge();
    if (!storage) return null;
    try {
      const entry = JSON.parse(storage.getItem(CACHE_PREFIX + name));
      if (entry && now() - entry.at < CACHE_MAX_AGE) return entry.data;
      storage.removeItem(CACHE_PREFIX + name);
    } catch {
      try {
        storage.removeItem(CACHE_PREFIX + name);
      } catch {
        // sin acceso
      }
    }
    return null;
  }

  function write(name, data) {
    if (!storage) return;
    try {
      storage.setItem(CACHE_PREFIX + name, JSON.stringify({ at: now(), data }));
    } catch {
      // Cuota llena o almacenamiento bloqueado: no es un error para el visitante.
    }
  }

  // Una sola descarga de la copia estática por carga de la aplicación (`fresh` la vuelve a pedir).
  function loadSnapshot({ fresh = false } = {}) {
    if (!snapshot || fresh) {
      snapshot = Promise.resolve()
        .then(() => fetchImpl(SNAPSHOT_PATH, { credentials: 'omit', cache: 'no-cache' }))
        .then((response) => (response.ok ? response.json() : null))
        .then((value) => (isSnapshot(value) ? value : null))
        .catch(() => null);
    }
    return snapshot;
  }

  return { read, write, loadSnapshot };
}

export const catalogCache = createCatalogCache();
