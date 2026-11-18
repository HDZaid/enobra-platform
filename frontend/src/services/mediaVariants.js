// Versiones reducidas que la API genera al subir cada imagen (lado mayor en píxeles).
// Tarjetas y miniaturas usan `card`; galerías y fichas, `full`. El original solo se
// descarga si la imagen no tiene versiones (por ejemplo, subidas anteriores).
export const MEDIA_SIZES = Object.freeze({ card: 800, full: 1920 });

const ALLOWED = new Set(Object.values(MEDIA_SIZES));
const R2_MEDIA_PATH = /^\/media\/r2\/[a-f0-9]{32}\/$/;

export function sizedMediaUrl(src, width) {
  if (typeof src !== 'string' || !ALLOWED.has(width)) return src;
  try {
    const absolute = /^https?:\/\//i.test(src);
    const url = new URL(src, 'http://enobra.invalid');
    if (!R2_MEDIA_PATH.test(url.pathname)) return src;
    url.searchParams.set('w', String(width));
    return absolute ? url.toString() : `${url.pathname}${url.search}`;
  } catch {
    return src;
  }
}
