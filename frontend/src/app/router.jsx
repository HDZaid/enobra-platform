import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { routePaths } from './routePaths.js';
import { NewsPage } from '../features/news/pages/NewsPage.jsx';
import { NewsDetailPage } from '../features/news/pages/NewsDetailPage.jsx';
import { ContactPage } from '../features/contact/pages/ContactPage.jsx';
import { AdminLoginPage } from '../features/admin/pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage.jsx';
import { AdminNewsPage } from '../features/admin/pages/AdminNewsPage.jsx';
import { AdminInboxPage } from '../features/admin/pages/AdminInboxPage.jsx';

// En esta fase son marcadores de ruta, no diseños definitivos.
const publicPages = [
  { path: routePaths.home, title: 'Inicio', owner: 'Leo' },
  { path: routePaths.about, title: 'Nosotros', owner: 'Leo' },
  { path: routePaths.services, title: 'Servicios', owner: 'Leo' },
  { path: routePaths.projects, title: 'Proyectos', owner: 'Geo' },
  { path: routePaths.projectDetail, title: 'Detalle del proyecto', owner: 'Geo' },
  { path: routePaths.properties, title: 'Bienes raíces', owner: 'Geo' },
  { path: routePaths.propertyDetail, title: 'Detalle de propiedad', owner: 'Geo' },
];

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: routePaths.news, element: <NewsPage /> },
      { path: routePaths.newsDetail, element: <NewsDetailPage /> },
      { path: routePaths.contact, element: <ContactPage /> },
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
      { path: routePaths.admin, element: <AdminDashboardPage /> },
      { path: routePaths.adminLogin, element: <AdminLoginPage /> },
      { path: routePaths.adminNews, element: <AdminNewsPage /> },
      { path: routePaths.adminInbox, element: <AdminInboxPage /> },
    ],
  },
]);
