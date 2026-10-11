import { NavLink } from 'react-router-dom';
import { routePaths } from '../../app/routePaths.js';

const links = [
  ['home', 'Inicio'],
  ['about', 'Nosotros'],
  ['services', 'Servicios'],
  ['projects', 'Proyectos'],
  ['properties', 'Bienes raíces'],
  ['news', 'Noticias'],
  ['contact', 'Contacto'],
];

export function Navbar({ open = false, footer = false, onNavigate }) {
  return (
    <nav
      id={footer ? undefined : 'navigation'}
      className={open ? 'open' : undefined}
      aria-label={footer ? 'Navegación del pie' : 'Navegación principal'}
    >
      {links.map(([key, title]) => (
        <NavLink key={key} to={routePaths[key]} end={key === 'home'} onClick={onNavigate}>
          {title}
        </NavLink>
      ))}
      {footer && <NavLink to={routePaths.admin}>Administración</NavLink>}
    </nav>
  );
}
