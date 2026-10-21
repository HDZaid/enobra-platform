import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Receives a resolved image URL, independent of the Storage provider.
// The parent supplies key={url || item.id} so a changed image can be retried.
export function NewsImage({ src, alt, className = '' }) {
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
        <div
          role="img"
          aria-label={`Imagen no disponible: ${alt}`}
          className="flex h-full min-h-[140px] w-full items-center justify-center text-[#626b79]"
        >
          <ImageOff size={38} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
