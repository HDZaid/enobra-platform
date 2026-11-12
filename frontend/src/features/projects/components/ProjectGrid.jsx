import { useEffect, useRef } from 'react';

export function ProjectGrid({ id, className = '', children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const grid = ref.current;
    const animations = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      Array.from(grid.children).forEach((card, index) => {
        if (!card.animate || card.contains(document.activeElement)) return;
        const animation = card.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 240,
            delay: Math.min(index, 3) * 45,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'backwards',
          },
        );
        animations.push(animation);
      });
      observer.disconnect();
    });

    observer.observe(grid);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <div ref={ref} id={id} className={`projects-grid geo-project-grid ${className}`}>
      {children}
    </div>
  );
}
