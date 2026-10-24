import { useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../features/admin/services/authService.js';
import { canAccessAdminSection, readAdminSession, refreshedAdminSession, sectionForPath } from '../../features/admin/utils/adminData.js';
import { AdminShell } from '../../features/admin/components/AdminShell.jsx';
import { AdminAccessDenied } from '../../features/admin/components/AdminAccessDenied.jsx';
import { routePaths } from '../../app/routePaths.js';
import { demoNews } from '../../features/news/data/demoNews.js';
import { demoInquiries } from '../../features/admin/utils/inbox.js';

export function AdminLayout() {
  const [session, setSession] = useState(null);
  const refreshGeneration = useRef(0);
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
    refreshGeneration.current += 1;
    setSession(nextSession);
    setPreview(false);
    navigate(routePaths.admin, { replace: true });
  }

  function openPreview() {
    if (!import.meta.env.DEV) return;
    refreshGeneration.current += 1;
    setPreview(true);
    setPreviewNews(demoNews.map((item) => ({ ...item })));
    setPreviewInquiries(demoInquiries.map((item) => ({ ...item })));
    setSession(null);
    navigate(routePaths.admin, { replace: true });
  }

  function logout() {
    refreshGeneration.current += 1;
    const previousSession = session;
    setSession(null);
    setPreview(false);
    navigate(routePaths.adminLogin, { replace: true });
    if (previousSession?.refresh) {
      // La sesión visual termina aunque el backend no esté disponible.
      void authService.logout(previousSession.refresh, previousSession.access).catch(() => {});
    }
  }

  async function refreshUser() {
    if (!session || preview) return null;
    const generation = ++refreshGeneration.current;
    const user = await authService.me(session.access);
    if (generation !== refreshGeneration.current) return null;
    let next;
    try {
      next = refreshedAdminSession(session, user);
    } catch (error) {
      logout();
      throw error;
    }
    setSession((current) => current?.access === session.access ? next : current);
    return next.user;
  }

  const context = { session, preview, previewNews, setPreviewNews, previewInquiries, setPreviewInquiries, login, openPreview, logout, refreshUser };
  const isLoginPage = location.pathname === routePaths.adminLogin;

  if (isLoginPage) {
    if (session || preview) return <Navigate to={routePaths.admin} replace />;
    return <Outlet context={context} />;
  }

  // La protección real de datos y operaciones pertenece al backend Django.
  if (!session && !preview) return <Navigate to={routePaths.adminLogin} replace />;

  // Se ocultan las secciones que Django rechazaría con 403 para el rol actual.
  const section = sectionForPath(location.pathname);
  const allowed = preview || Boolean(section && canAccessAdminSection(session.user, section));

  return (
    <AdminShell user={session?.user} preview={preview} onLogout={logout}>
      {allowed ? <Outlet context={context} /> : <AdminAccessDenied user={session.user} />}
    </AdminShell>
  );
}
