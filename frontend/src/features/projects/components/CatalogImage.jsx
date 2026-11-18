import { useState } from 'react';
import { ImageFallback } from '../../../components/ui/SafeImage.jsx';
import { MEDIA_SIZES, sizedMediaUrl } from '../../../services/mediaVariants.js';

// `width` elige la versión reducida (800 en tarjetas por defecto, 1920 en galerías).
export function CatalogImage({ src, alt, width = MEDIA_SIZES.card, ...props }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src)
    return (
      <ImageFallback
        alt={alt}
        className="geo-image-fallback"
        message={src ? 'No se pudo cargar la imagen' : 'Imagen no disponible'}
      />
    );
  return <img {...props} src={sizedMediaUrl(src, width)} alt={alt} onError={() => setFailed(src)} />;
}
