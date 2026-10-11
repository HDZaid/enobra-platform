import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Brand } from './Brand.jsx';
import { Navbar } from './Navbar.jsx';
import { SearchDialog } from './SearchDialog.jsx';

export function Header({ company, scrolled, locationKey }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    setOpen(false);
    setSearch(false);
  }, [locationKey]);
  useEffect(() => {
    const outside = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const keydown = (event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    const resize = () => {
      if (window.innerWidth > 768) setOpen(false);
    };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', resize);
    };
  }, [open]);
  return (
    <div className="leo-chrome">
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      <header ref={ref} id="header" className={scrolled ? 'scrolled' : undefined}>
        <div className="header-inner">
          <Brand company={company} />
          <Navbar open={open} onNavigate={() => setOpen(false)} />
          <button
            className="icon-button"
            id="search-open"
            aria-label="Abrir buscador"
            onClick={() => {
              setOpen(false);
              setSearch(true);
            }}
          >
            <Search aria-hidden="true" />
          </button>
          <button
            ref={menuRef}
            className="icon-button menu-toggle"
            id="menu-toggle"
            aria-controls="navigation"
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className="header-manifesto" aria-hidden="true">
          <span className="manifesto-copy">
            IDEAS
            <br />
            ESPACIOS
            <br />
            PERSONAS
            <br />
            UN MEJOR MAÑANA
          </span>
          <i />
        </div>
      </header>
      {search && <SearchDialog onClose={() => setSearch(false)} />}
    </div>
  );
}
