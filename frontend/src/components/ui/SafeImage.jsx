import { useState } from 'react';
import { ArchMark, StatusDrawing } from './ColonialOrnaments.jsx';
import { useSignage } from './signage.js';

export function ImageFallback({ alt, className = '', message = 'No se pudo cargar la imagen' }) {
  const signage = useSignage();
  const text = signage ? message : 'Imagen no disponible';
  return (
    <div
      className={`image-fallback ${className}`}
      role="img"
      aria-label={`${alt || 'Fotografía'}: ${text.toLowerCase()}`}
    >
      {signage ? <StatusDrawing variant="image" /> : <ArchMark />}
      <span aria-hidden="true">{text}</span>
    </div>
  );
}

// <img> that swaps to the drawn fallback when the file cannot be loaded.
export function SafeImage({ src, alt, className, ...props }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return <ImageFallback alt={alt} className={className} />;
  return (
    <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(src)} />
  );
}
