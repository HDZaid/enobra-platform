import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CatalogImage } from './CatalogImage.jsx';
import { parseYoutube } from '../services/catalogMapper.js';

export function MediaGallery({ item }) {
  const [index, setIndex] = useState(0);
  const slides = [
    ...item.images.map((src) => ({ src, kind: 'Fotografía' })),
    ...item.renders.map((src) => ({ src, kind: 'Render' })),
  ];
  if (!slides.length)
    return (
      <div className="geo-gallery">
        <CatalogImage alt={item.title} />
      </div>
    );
  const active = index % slides.length;
  const show = (step) => setIndex((active + step + slides.length) % slides.length);
  return (
    <section className="geo-gallery" aria-label={`Galería de ${item.title}`}>
      <div className="geo-gallery-main">
        <CatalogImage
          src={slides[active].src}
          alt={`${item.title} · ${slides[active].kind.toLowerCase()} ${active + 1}${item.demo ? ' de referencia' : ''}`}
        />
        <div className="geo-gallery-controls">
          <button
            className="icon-button"
            aria-label="Imagen anterior"
            disabled={slides.length < 2}
            onClick={() => show(-1)}
          >
            <ArrowLeft />
          </button>
          <span aria-live="polite">
            {slides[active].kind} · {active + 1} / {slides.length}
          </span>
          <button
            className="icon-button"
            aria-label="Imagen siguiente"
            disabled={slides.length < 2}
            onClick={() => show(1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="geo-thumbnails">
        {slides.map((slide, i) => (
          <button
            key={i}
            aria-label={`Ver ${slide.kind.toLowerCase()} ${i + 1}`}
            aria-pressed={active === i}
            onClick={() => setIndex(i)}
          >
            <CatalogImage src={slide.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
}

// El contrato solo entrega enlaces de YouTube. El embed se arma con el ID validado (dominio
// sin cookies, iframe aislado) y siempre se ofrece un enlace de respaldo por si el iframe falla.
export function CatalogVideo({ src, title = 'este registro' }) {
  const video = parseYoutube(src);
  if (!video) return null;
  return (
    <div className="geo-video">
      <h2>Video</h2>
      <div className="geo-video-frame">
        <iframe
          src={video.embedUrl}
          title={`Video de ${title}`}
          loading="lazy"
          allowFullScreen
          allow="encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
      <a
        className="text-link"
        href={video.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver en YouTube: ${title} (se abre en una pestaña nueva)`}
      >
        Ver en YouTube ↗
      </a>
    </div>
  );
}
