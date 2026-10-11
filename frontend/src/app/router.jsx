import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { routePaths } from './routePaths.js';
import { NewsPage } from '../features/news/pages/NewsPage.jsx';
import { NewsDetailPage } from '../features/news/pages/NewsDetailPage.jsx';

// En esta fase son marcadores de ruta, no diseños definitivos.
const publicPages = [
  { path: routePaths.home, title: 'Inicio', owner: 'Leo' },
  { path: routePaths.about, title: 'Nosotros', owner: 'Leo' },
  { path: routePaths.services, title: 'Servicios', owner: 'Leo' },
  { path: routePaths.projects, title: 'Proyectos', owner: 'Geo' },
  { path: routePaths.projectDetail, title: 'Detalle del proyecto', owner: 'Geo' },
  { path: routePaths.properties, title: 'Bienes raíces', owner: 'Geo' },
  { path: routePaths.propertyDetail, title: 'Detalle de propiedad', owner: 'Geo' },
  { path: routePaths.contact, title: 'Contacto', owner: 'Jennifer' },
];

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: routePaths.news, element: <NewsPage /> },
      { path: routePaths.newsDetail, element: <NewsDetailPage /> },
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
