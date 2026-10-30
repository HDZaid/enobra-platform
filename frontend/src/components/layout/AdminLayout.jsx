import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../features/admin/services/authService.js';
import { canAccessAdminPath, readAdminSession, refreshedAdminSession } from '../../features/admin/utils/adminData.js';
import { AdminShell } from '../../features/admin/components/AdminShell.jsx';
import { routePaths } from '../../app/routePaths.js';
import { demoNews } from '../../features/news/data/demoNews.js';
import { demoInquiries } from '../../features/admin/utils/inbox.js';
import { createSessionLifecycle } from '../../features/admin/services/sessionLifecycle.js';
import { installAdminTransport } from '../../services/adminTransport.js';
import { SessionNotification } from '../../features/admin/components/SessionNotification.jsx';

export function AdminLayout() {
  const [session, setSession] = useState(null);
  const [sessionState, setSessionState] = useState({ status: 'off', seconds: 0 });
  const [lifecycle] = useState(() => createSessionLifecycle({
    refresh: authService.refresh,
    revoke: (refresh) => authService.logout(refresh),
    onChange: setSessionState,
    visible: () => document.visibilityState === 'visible',
  }));
  const refreshGeneration = useRef(0);
  const [preview, setPreview] = useState(false);
  const [previewNews, setPreviewNews] = useState(() => demoNews.map((item) => ({ ...item })));
  const [previewInquiries, setPreviewInquiries] = useState(() => demoInquiries.map((item) => ({ ...item })));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const uninstall = installAdminTransport(lifecycle);
    const timer = window.setInterval(lifecycle.tick, 1000);
    const activity = (event) => { if (event.isTrusted) lifecycle.activity(); };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', lifecycle.tick);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, activity, true));
      document.removeEventListener('visibilitychange', lifecycle.tick);
      uninstall(); lifecycle.stop();
    };
  }, [lifecycle]);

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
    lifecycle.start(payload);
    setSession(nextSession);
    setPreview(false);
    navigate(routePaths.admin, { replace: true });
  }

  function openPreview() {
    if (!import.meta.env.DEV) return;
    refreshGeneration.current += 1;
    lifecycle.stop();
    setPreview(true);
    setPreviewNews(demoNews.map((item) => ({ ...item })));
    setPreviewInquiries(demoInquiries.map((item) => ({ ...item })));
    setSession(null);
    navigate(routePaths.admin, { replace: true });
  }

  function logout() {
    refreshGeneration.current += 1;
    const previousSession = session;
    lifecycle.stop();
    setSession(null);
    setPreview(false);
    navigate(routePaths.adminLogin, { replace: true });
    if (previousSession?.refresh) {
      // La sesión visual termina aunque el backend no esté disponible.
      void authService.logout(previousSession.refresh, previousSession.access).catch(() => {});
    }
  }

  async function reauthenticate(credentials) {
    const payload = await authService.login(credentials);
    let next;
    try {
      next = readAdminSession(payload);
      if (next.user.id !== session.user.id) throw new Error('Debes volver a entrar con la misma cuenta.');
      // Alias estable: renovar tokens no remonta formularios ni borra borradores.
      lifecycle.start(payload, session.access);
    } catch (error) {
      if (payload?.refresh) void authService.logout(payload.refresh).catch(() => {});
      throw error;
    }
    refreshGeneration.current += 1;
    setSession({ ...next, access: session.access });
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

  return (<>
    <div inert={sessionState.status === 'expired' ? '' : undefined}>
      <AdminShell user={session?.user} preview={preview} onLogout={logout}>
        <Outlet context={context} />
      </AdminShell>
    </div>
    {!preview && <SessionNotification state={sessionState} email={session.user.email} onContinue={lifecycle.activity} onReauthenticate={reauthenticate} onLogout={logout} />}
  </>);
}
