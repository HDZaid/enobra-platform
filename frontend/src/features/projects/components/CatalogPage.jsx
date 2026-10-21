import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MotionPage } from '../../../components/ui/MotionPage.jsx';

export function CatalogPage({ title, children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    // The shared layout still classifies these routes as pending and resets the title.
    const frame = requestAnimationFrame(() => {
      document.title = `${title} | EnObra`;
    });
    return () => cancelAnimationFrame(frame);
  }, [title, pathname]);
  return <MotionPage title={title}>{children}</MotionPage>;
}
