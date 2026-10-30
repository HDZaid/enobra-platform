import { useState } from 'react';
import { ImageFallback } from '../../../components/ui/SafeImage.jsx';

// Receives a resolved image URL, independent of the Storage provider.
// The parent supplies key={url || item.id} so a changed image can be retried.
export function NewsImage({ src, alt, className = '', children }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#f3f6fa] ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageFallback
          alt={alt}
          className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-2 text-[13px] text-[#626b79]"
          message={src ? 'No se pudo cargar la imagen' : 'Imagen no disponible'}
        />
      )}
      {children}
    </div>
  );
}
