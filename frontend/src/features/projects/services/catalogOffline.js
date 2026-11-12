import { catalogCache } from '../../../services/catalogCache.js';
import {
  presentWithMedia,
  snapshotExtra,
  snapshotItem,
  snapshotPage,
} from '../../../services/catalogSnapshot.js';
import { mapPage } from './catalogMapper.js';

// Une un loader público con la caché local y la copia estática del despliegue.
//   load(key, options): pide a la API, guarda la respuesta y la entrega.
//   read(key): lo último guardado (≤ 7 días) o la copia estática; null si no hay nada.
export function createOfflineResource({ name, loader, fromSnapshot, cache = catalogCache }) {
  async function present(data) {
    if (data == null) return data;
    const snapshot = await cache.loadSnapshot();
    return presentWithMedia(data, snapshot?.media);
  }
  return {
    async load(key, options) {
      const data = await loader(key, options);
      cache.write(`${name}:${key}`, data);
      return present(data);
    },
    async read(key) {
      let data = cache.read(`${name}:${key}`);
      if (data == null && fromSnapshot) {
        const snapshot = await cache.loadSnapshot();
        try {
          data = snapshot ? fromSnapshot(snapshot, key) : null;
        } catch {
          data = null; // copia que no cumple el contrato: se ignora
        }
      }
      return present(data ?? null);
    },
  };
}

export function snapshotList(kind, mapper) {
  return (snapshot, options) => {
    const raw = snapshotPage(snapshot, kind, options);
    return raw ? mapPage(raw, mapper) : null;
  };
}

export function snapshotDetail(kind, mapper) {
  return (snapshot, id) => {
    const raw = snapshotItem(snapshot, kind, id);
    const item = raw ? mapper(raw) : null;
    return item?.published ? item : null;
  };
}

export { snapshotExtra };
