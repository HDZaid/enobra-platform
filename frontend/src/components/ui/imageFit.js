// Evita recortes extremos sin deformar la imagen. No intenta detectar rostros o sujetos.
export function imageFit(width, height, frameWidth, frameHeight) {
  if (![width, height, frameWidth, frameHeight].every((n) => Number.isFinite(n) && n > 0)) return { objectFit: 'cover', objectPosition: 'center' };
  const ratio = width / height;
  const frame = frameWidth / frameHeight;
  const retained = Math.min(ratio / frame, frame / ratio);
  return {
    objectFit: retained < 0.6 ? 'contain' : 'cover',
    objectPosition: ratio < 0.9 && retained >= 0.6 ? 'center top' : 'center',
  };
}
