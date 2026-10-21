import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function CatalogImage({ src, alt, ...props }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src)
    return (
      <div
        className="geo-image-fallback"
        role="img"
        aria-label={`${alt || 'Fotografía'}: imagen no disponible`}
      >
        <ImageOff aria-hidden="true" />
        <span>Imagen no disponible</span>
      </div>
    );
  return <img {...props} src={src} alt={alt} onError={() => setFailed(src)} />;
}
