import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CatalogImage } from './CatalogImage.jsx';
import { parseYoutube } from '../services/catalogMapper.js';

export function MediaGallery({ item, previewAction }) {
  const [index, setIndex] = useState(0);
  const preview = Boolean(previewAction);
  const slides = [
    ...item.images.map((src) => ({ src, kind: 'Imagen' })),
    ...item.renders.map((src) => ({ src, kind: 'Render' })),
  ];
  const count = slides.length;
  const active = count ? index % count : 0;
  const slide = slides[active];
  const show = (step) => setIndex((current) => (current + step + count) % count);
  const Previous = preview ? ChevronLeft : ArrowLeft;
  const Next = preview ? ChevronRight : ArrowRight;

  const image = (
    <CatalogImage
      src={slide?.src}
      alt={slide
        ? `${item.title} · ${slide.kind.toLowerCase()} ${active + 1}${item.demo ? ' de referencia' : ''}`
        : item.title}
    />
  );
  const counter = slide && <span aria-live="polite">{slide.kind} · {active + 1} / {count}</span>;
  const previous = (
    <button
      type="button"
      className="icon-button geo-gallery-prev"
      aria-label="Imagen anterior"
      disabled={count < 2}
      onClick={() => show(-1)}
    >
      <Previous aria-hidden="true" />
    </button>
  );
  const next = (
    <button
      type="button"
      className="icon-button geo-gallery-next"
      aria-label="Imagen siguiente"
      disabled={count < 2}
      onClick={() => show(1)}
    >
      <Next aria-hidden="true" />
    </button>
  );
  const thumbnails = (
    <div className="geo-thumbnails">
      {slides.map((entry, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Ver ${entry.kind.toLowerCase()} ${i + 1}`}
          aria-pressed={active === i}
          onClick={() => setIndex(i)}
        >
          <CatalogImage src={entry.src} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );

  if (!count && !preview) return <div className="geo-gallery">{image}</div>;

  return (
    <section
      className="geo-gallery"
      aria-label={`Galería de ${item.title}`}
      onKeyDown={preview && count > 1 ? (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          show(event.key === 'ArrowLeft' ? -1 : 1);
        }
      } : undefined}
    >
      <div className="geo-gallery-main">
        {preview ? (
          <div className="geo-gallery-frame">
            {image}
            {count > 1 && previous}
            {count > 1 && next}
          </div>
        ) : (
          <>
            {image}
            <div className="geo-gallery-controls">{previous}{counter}{next}</div>
          </>
        )}
      </div>
      {preview ? (
        <div className="geo-preview-strip">
          {counter && <div className="geo-preview-counter">{counter}</div>}
          {count > 1 && thumbnails}
          {previewAction}
        </div>
      ) : thumbnails}
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
