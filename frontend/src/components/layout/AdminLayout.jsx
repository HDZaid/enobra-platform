import { useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../features/admin/services/authService.js';
import { canAccessAdminPath, readAdminSession, refreshedAdminSession } from '../../features/admin/utils/adminData.js';
import { AdminShell } from '../../features/admin/components/AdminShell.jsx';
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
  const allowed = preview || canAccessAdminPath(session.user, location.pathname);
  // No se monta la vista restringida ni se hacen sus peticiones HTTP.
  if (!allowed) return <Navigate to={routePaths.admin} replace />;

  return (
    <AdminShell user={session?.user} preview={preview} onLogout={logout}>
      {!preview && <p role="status" className="mb-5 rounded-lg border border-[#f4cfae] bg-[#fff1e5] p-4 text-sm text-[#88420d]">La sesión dura 15 minutos y todavía no se renueva automáticamente. Guarda tu trabajo y vuelve a iniciar sesión antes de cada recorrido largo de la demo. Si aparece un error 401 al guardar, el cambio no está confirmado: conserva el contenido antes de salir.</p>}
      <Outlet context={context} />
    </AdminShell>
  );
}
