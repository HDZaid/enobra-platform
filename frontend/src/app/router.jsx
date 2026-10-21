import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { routePaths } from './routePaths.js';
import { HomePage } from '../features/home/pages/HomePage.jsx';
import { AboutPage } from '../features/about/pages/AboutPage.jsx';
import { ServicesPage } from '../features/services/pages/ServicesPage.jsx';
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
  { path: routePaths.news, title: 'Noticias', owner: 'Jennifer' },
  { path: routePaths.newsDetail, title: 'Detalle de noticia', owner: 'Jennifer' },
  { path: routePaths.contact, title: 'Contacto', owner: 'Jennifer' },
];

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
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
