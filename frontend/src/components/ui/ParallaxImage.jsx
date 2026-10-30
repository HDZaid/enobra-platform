import { useEffect, useRef, useState } from 'react';
import { imageFit } from './imageFit.js';
import { ImageFallback } from './SafeImage.jsx';

export function ParallaxImage({ factor = 0.035, adaptive = false, className = '', style, onLoad, ...props }) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ objectFit: 'cover', objectPosition: 'center' });
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    if (!adaptive) return;
    const img = ref.current;
    const frame = img?.parentElement;
    if (!img || !frame) return;
    const measure = () => setFit(imageFit(img.naturalWidth, img.naturalHeight, frame.clientWidth, frame.clientHeight));
    img.addEventListener('load', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure(); // Incluye imágenes servidas desde caché.
    return () => { img.removeEventListener('load', measure); observer.disconnect(); };
  }, [adaptive, props.src]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const paint = () => {
      frame = null;
      const rect = ref.current?.parentElement.getBoundingClientRect();
      if (!rect) return;
      setOffset(
        motion.matches || window.innerWidth <= 768
          ? 0
          : Math.max(
              -42,
              Math.min(42, (rect.top + rect.height / 2 - window.innerHeight / 2) * factor),
            ),
      );
    };
    const update = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    motion.addEventListener('change', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      motion.removeEventListener('change', update);
    };
  }, [factor]);
  if (failed === props.src)
    return (
      <div ref={ref} className="parallax-fallback">
        <ImageFallback alt={props.alt} />
      </div>
    );
  return (
    <img
      {...props}
      ref={ref}
      className={`parallax-media ${className}`}
      style={{ '--parallax-y': `${offset}px`, ...style, ...(adaptive ? fit : {}), ...(adaptive && fit.objectFit === 'contain' ? { transform: 'none', inset: 0, height: '100%' } : {}) }}
      onLoad={onLoad}
      onError={() => setFailed(props.src)}
    />
  );
}
