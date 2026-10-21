import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { routePaths } from './routePaths.js';
import { HomePage } from '../features/home/pages/HomePage.jsx';
import { AboutPage } from '../features/about/pages/AboutPage.jsx';
import { ServicesPage } from '../features/services/pages/ServicesPage.jsx';
import { NewsPage } from '../features/news/pages/NewsPage.jsx';
import { NewsDetailPage } from '../features/news/pages/NewsDetailPage.jsx';
import { ContactPage } from '../features/contact/pages/ContactPage.jsx';
import { AdminLoginPage } from '../features/admin/pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage.jsx';
import { AdminNewsPage } from '../features/admin/pages/AdminNewsPage.jsx';
import { AdminInboxPage } from '../features/admin/pages/AdminInboxPage.jsx';
import { ProjectsPage } from '../features/projects/pages/ProjectsPage.jsx';
import { ProjectDetailPage } from '../features/projects/pages/ProjectDetailPage.jsx';
import { PropertiesPage } from '../features/properties/pages/PropertiesPage.jsx';
import { PropertyDetailPage } from '../features/properties/pages/PropertyDetailPage.jsx';

// Las rutas de cada módulo se integran sin reemplazar las páginas del equipo.
const publicPages = [
  { path: routePaths.home, title: 'Inicio', owner: 'Leo', element: <HomePage /> },
  { path: routePaths.about, title: 'Nosotros', owner: 'Leo', element: <AboutPage /> },
  { path: routePaths.services, title: 'Servicios', owner: 'Leo', element: <ServicesPage /> },
  { path: routePaths.projects, title: 'Proyectos', owner: 'Geo', element: <ProjectsPage /> },
  {
    path: routePaths.projectDetail,
    title: 'Detalle del proyecto',
    owner: 'Geo',
    element: <ProjectDetailPage />,
  },
  {
    path: routePaths.properties,
    title: 'Bienes raíces',
    owner: 'Geo',
    element: <PropertiesPage />,
  },
  {
    path: routePaths.propertyDetail,
    title: 'Detalle de propiedad',
    owner: 'Geo',
    element: <PropertyDetailPage />,
  },
];

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: routePaths.news, element: <NewsPage /> },
      { path: routePaths.newsDetail, element: <NewsDetailPage /> },
      { path: routePaths.contact, element: <ContactPage /> },
      ...publicPages.map(({ path, title, owner, element }) => ({
        path,
        element: element ?? <PendingPage title={title} owner={owner} />,
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
