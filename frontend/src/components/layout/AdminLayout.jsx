import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../features/admin/services/authService.js';
import { canAccessAdminSection, readAdminSession } from '../../features/admin/utils/adminData.js';
import { AdminShell } from '../../features/admin/components/AdminShell.jsx';
import { AdminAccessDenied } from '../../features/admin/components/AdminAccessDenied.jsx';
import { routePaths } from '../../app/routePaths.js';
import { demoNews } from '../../features/news/data/demoNews.js';
import { demoInquiries } from '../../features/admin/utils/inbox.js';

// Sección del panel que corresponde a cada ruta (ver adminSectionPermissions).
const sectionByPath = {
  [routePaths.admin]: 'dashboard',
  [routePaths.adminProperties]: 'properties',
  [routePaths.adminNews]: 'news',
  [routePaths.adminInbox]: 'inbox',
  [routePaths.adminUsers]: 'users',
};

export function AdminLayout() {
  const [session, setSession] = useState(null);
  const [preview, setPreview] = useState(false);
  const [previewNews, setPreviewNews] = useState(() => demoNews.map((item) => ({ ...item })));
  const [previewInquiries, setPreviewInquiries] = useState(() => demoInquiries.map((item) => ({ ...item })));
  const navigate = useNavigate();
  const location = useLocation();

  async function login(credentials) {
    const payload = await authService.login(credentials);
    let nextSession;
    try {
      nextSession = readAdminSession(payload);
    } catch (error) {
      // Django ya abrió una sesión: se revoca para no dejar un refresh token huérfano.
      if (typeof payload?.refresh === 'string' && payload.refresh) {
        void authService.logout(payload.refresh, payload.access).catch(() => {});
      }
      throw error;
    }
    setSession(nextSession);
    setPreview(false);
    navigate(routePaths.admin, { replace: true });
  }

  function openPreview() {
    if (!import.meta.env.DEV) return;
    setPreview(true);
    setPreviewNews(demoNews.map((item) => ({ ...item })));
    setPreviewInquiries(demoInquiries.map((item) => ({ ...item })));
    setSession(null);
    navigate(routePaths.admin, { replace: true });
  }

  function logout() {
    const previousSession = session;
    setSession(null);
    setPreview(false);
    navigate(routePaths.adminLogin, { replace: true });
    if (previousSession?.refresh) {
      // La sesión visual termina aunque el backend no esté disponible.
      void authService.logout(previousSession.refresh, previousSession.access).catch(() => {});
    }
  }

  const context = { session, preview, previewNews, setPreviewNews, previewInquiries, setPreviewInquiries, login, openPreview, logout };
  const isLoginPage = location.pathname === routePaths.adminLogin;

  if (isLoginPage) {
    if (session || preview) return <Navigate to={routePaths.admin} replace />;
    return <Outlet context={context} />;
  }

  // La protección real de datos y operaciones pertenece al backend Django.
  if (!session && !preview) return <Navigate to={routePaths.adminLogin} replace />;

  // Se ocultan las secciones que Django rechazaría con 403 para el rol actual.
  const section = sectionByPath[location.pathname.replace(/\/+$/, '') || routePaths.admin];
  const allowed = preview || !section || canAccessAdminSection(session.user, section);

  return (
    <AdminShell user={session?.user} preview={preview} onLogout={logout}>
      {allowed ? <Outlet context={context} /> : <AdminAccessDenied user={session.user} />}
    </AdminShell>
  );
}
