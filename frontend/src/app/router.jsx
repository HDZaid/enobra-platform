import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.jsx';
import { SiteLayout } from '../components/layout/SiteLayout.jsx';
import { PendingPage } from '../features/shared/pages/PendingPage.jsx';
import { NotFoundPage } from '../features/shared/pages/NotFoundPage.jsx';
import { routePaths } from './routePaths.js';
import { HomePage } from '../features/home/pages/HomePage.jsx';
import { AboutPage } from '../features/about/pages/AboutPage.jsx';
import { ServicesPage } from '../features/services/pages/ServicesPage.jsx';
import { NewsPage } from '../features/news/pages/NewsPage.jsx';
import { NewsDetailPage } from '../features/news/pages/NewsDetailPage.jsx';
import { ContactPage } from '../features/contact/pages/ContactPage.jsx';
import { AdminHistoryPage } from '../features/admin-history/pages/AdminHistoryPage.jsx';
import { AdminLoginPage } from '../features/admin/pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage.jsx';
import { AdminNewsPage } from '../features/admin/pages/AdminNewsPage.jsx';
import { AdminInboxPage } from '../features/admin/pages/AdminInboxPage.jsx';
import { AdminUsersPage } from '../features/admin/pages/AdminUsersPage.jsx';
import { AdminProjectsPage } from '../features/admin-projects/pages/AdminProjectsPage.jsx';
import { AdminProjectEditorPage } from '../features/admin-projects/pages/AdminProjectEditorPage.jsx';
import { AdminRolesPage } from '../features/admin-roles/pages/AdminRolesPage.jsx';
import { AdminRoleEditorPage } from '../features/admin-roles/pages/AdminRoleEditorPage.jsx';
import { AdminPropertiesPage } from '../features/admin-properties/pages/AdminPropertiesPage.jsx';
import { AdminPropertyEditorPage } from '../features/admin-properties/pages/AdminPropertyEditorPage.jsx';
import { AdminTrashPage } from '../features/admin-trash/pages/AdminTrashPage.jsx';
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: routePaths.admin, element: <AdminDashboardPage /> },
      { path: routePaths.adminLogin, element: <AdminLoginPage /> },
      { path: routePaths.adminProperties, element: <AdminPropertiesPage /> },
      { path: routePaths.adminPropertyNew, element: <AdminPropertyEditorPage /> },
      { path: routePaths.adminPropertyEdit, element: <AdminPropertyEditorPage /> },
      { path: routePaths.adminProjects, element: <AdminProjectsPage /> },
      { path: routePaths.adminProjectNew, element: <AdminProjectEditorPage /> },
      { path: routePaths.adminProjectEdit, element: <AdminProjectEditorPage /> },
      { path: routePaths.adminTrash, element: <AdminTrashPage /> },
      { path: routePaths.adminHistory, element: <AdminHistoryPage /> },
      { path: routePaths.adminRoles, element: <AdminRolesPage /> },
      { path: routePaths.adminRoleNew, element: <AdminRoleEditorPage /> },
      { path: routePaths.adminRoleDetail, element: <AdminRoleEditorPage /> },
      { path: routePaths.adminNews, element: <AdminNewsPage /> },
      { path: routePaths.adminInbox, element: <AdminInboxPage /> },
      { path: routePaths.adminUsers, element: <AdminUsersPage /> },
    ],
  },
]);
