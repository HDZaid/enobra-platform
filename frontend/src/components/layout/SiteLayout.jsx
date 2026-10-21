import { useEffect, useState } from 'react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { reference } from './data/reference.js';
import { companyService } from './services/companyService.js';
import { useReferenceResource } from '../ui/useReferenceResource.js';
import '../../styles/leo.css';
import { routePaths } from '../../app/routePaths.js';

export function SiteLayout() {
  const location = useLocation();
  const company = useReferenceResource(companyService.get, reference);
  const [scroll, setScroll] = useState(0);
  const page =
    { '/': 'index', '/nosotros': 'nosotros', '/servicios': 'servicios' }[location.pathname] ||
    'pending';
  useEffect(() => {
    const update = () => setScroll(window.scrollY);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if (location.hash) {
      let id;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      const frame = requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        }),
      );
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
    if (!Object.values(routePaths).some((path) => matchPath({ path, end: true }, location.pathname))) {
      document.title = 'Página no encontrada | EnObra';
    }
  }, [location.pathname, location.hash, page]);
  return (
    <div className="leo-site" data-page={page}>
      <Header company={company.data} scrolled={scroll > 30} locationKey={location.key} />
      <main id="main" className="leo-site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer resource={company} />
      <div className="leo-chrome">
        <button
          id="back-top"
          className="icon-button"
          aria-label="Volver arriba"
          hidden={scroll < 600}
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
            });
            document.querySelector('#header .brand')?.focus({ preventScroll: true });
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
