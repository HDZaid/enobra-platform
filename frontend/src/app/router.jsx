import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { routePaths } from './routePaths.js';

// En esta fase son marcadores de ruta, no diseños definitivos.
const publicPages = [
  { path: routePaths.home, title: 'Inicio', owner: 'Leo' },
  { path: routePaths.about, title: 'Nosotros', owner: 'Leo' },
  { path: routePaths.services, title: 'Servicios', owner: 'Leo' },
  { path: routePaths.projects, title: 'Proyectos', owner: 'Geo' },
  { path: routePaths.projectDetail, title: 'Detalle del proyecto', owner: 'Geo' },
  { path: routePaths.properties, title: 'Bienes raíces', owner: 'Geo' },
  { path: routePaths.propertyDetail, title: 'Detalle de propiedad', owner: 'Geo' },
  { path: routePaths.news, title: 'Noticias', owner: 'Jennifer' },
  { path: routePaths.newsDetail, title: 'Detalle de noticia', owner: 'Jennifer' },
  { path: routePaths.contact, title: 'Contacto', owner: 'Jennifer' },
];

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      ...publicPages.map(({ path, title, owner }) => ({
        path,
        element: <PendingPage title={title} owner={owner} />,
      })),
      { path: '*', element: <PendingPage title="Página no encontrada" /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      {
        path: routePaths.admin,
        element: <PendingPage title="Panel administrativo" owner="Equipo" />,
      },
      {
        path: routePaths.adminLogin,
        element: <PendingPage title="Acceso administrativo" owner="Jennifer" />,
      },
    ],
  },
]);
