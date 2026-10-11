import { Outlet } from 'react-router-dom';

// NO representa control de acceso: Django debe validar permisos en cada petición.
export function AdminLayout() {
  return <Outlet />;
}
