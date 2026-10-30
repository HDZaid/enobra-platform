import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Web Animations does not hide content if observers or animation support are unavailable.
export function MotionPage({ title, children }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    document.title = `${title} | EnObra`;
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const animations = [];
    const observer = new IntersectionObserver(
      (entries) => {
        // Elements revealed in the same pass cascade 60 ms apart instead of landing at once.
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Math.min(order++, 4) * 60;
          animations.push(
            entry.target.animate(
              [
                { opacity: 0, transform: 'translateY(20px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              { duration: 600, delay, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' },
            ),
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    ref.current
      .querySelectorAll(
        '.home-about-copy,.home-about-visual,.section-heading,.business-card,.project-card,.news-card,.service-feature,.principles-grid article,.impact-content > *',
      )
      .forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [title]);
  return (
    <div
      className="leo-page"
      ref={ref}
      onClick={(event) => {
        const anchor = event.target.closest('a[href^="#"]');
        if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const hash = anchor.getAttribute('href');
        if (window.location.hash === hash) {
          document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
        } else {
          navigate(hash);
        }
      }}
    >
      {children}
    </div>
  );
}
