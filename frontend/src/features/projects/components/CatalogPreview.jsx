import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { MediaGallery } from './MediaGallery.jsx';

export function CatalogPreview({ item, to, summary, animateEntry, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="geo-preview"
      aria-labelledby={titleId}
      data-animate-entry={animateEntry || undefined}
      onCancel={onClose}
    >
      <div className="geo-preview-header">
        <div>
          <h2 id={titleId}>{item.title}</h2>
          <p>{summary}{item.demo && ' · Referencia'}</p>
        </div>
        <button type="button" className="geo-preview-close" aria-label="Cerrar vista previa" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="geo-preview-media">
        <MediaGallery item={item} preview />
      </div>
      <div className="geo-preview-footer">
        <span>Explora las fotos y consulta la ficha completa.</span>
        <Link to={to} className="geo-preview-details">Ver información completa <ArrowUpRight aria-hidden="true" /></Link>
      </div>
    </dialog>
  );
}

