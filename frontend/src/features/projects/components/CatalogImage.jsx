import { useState } from 'react';
import { ImageFallback } from '../../../components/ui/SafeImage.jsx';

export function CatalogImage({ src, alt, ...props }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src)
    return (
      <ImageFallback
        alt={alt}
        className="geo-image-fallback"
        message={src ? 'No se pudo cargar la imagen' : 'Imagen no disponible'}
      />
    );
  return <img {...props} src={src} alt={alt} onError={() => setFailed(src)} />;
}
