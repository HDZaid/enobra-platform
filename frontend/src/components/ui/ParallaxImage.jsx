import { useEffect, useRef, useState } from 'react';

export function ParallaxImage({ factor = 0.035, ...props }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);
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
  return (
    <img
      {...props}
      ref={ref}
      className="parallax-media"
      style={{ '--parallax-y': `${offset}px` }}
    />
  );
}
