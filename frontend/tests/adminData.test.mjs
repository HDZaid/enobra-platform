import assert from 'node:assert/strict';
import test from 'node:test';
import { adminSectionPermissions, refreshedAdminSession, sectionForPath, adminRoleProfile, canAccessAdminSection, displayAdminCount, hasAdminPermission, inquiryStatuses, readAdminCollection, readAdminSession, validInquiryStatus } from '../src/features/admin/utils/adminData.js';

// Respuestas con la forma real de UserSerializer (role, roles, permissions).
const ARCHITECT_PERMISSIONS = ['properties.create', 'properties.edit.any', 'properties.publish', 'properties.trash.any', 'properties.restore'];
const EMPLOYEE_PERMISSIONS = ['properties.create', 'properties.edit.own', 'properties.trash.own'];
const loginResponse = (user) => ({ access: 'token', refresh: 'refresh', expires_in: 900, user: { id: 1, name: 'Cuenta', email: 'cuenta@example.com', ...user } });

test('acepta los roles Ingeniero, Arquitecta y Empleado que devuelve Django', () => {
  const engineer = readAdminSession(loginResponse({ role: 'Ingeniero', roles: ['Ingeniero'], permissions: ['admin.all', 'users.manage'] }));
  assert.equal(engineer.user.role, 'Ingeniero');
  assert.equal(engineer.user.id, '1');
  assert.deepEqual(engineer.user.roles, ['Ingeniero']);
  assert.deepEqual(engineer.user.permissions, ['admin.all', 'users.manage']);

  const architect = readAdminSession(loginResponse({ role: 'Arquitecta', roles: ['Arquitecta'], permissions: ARCHITECT_PERMISSIONS }));
  assert.equal(architect.user.role, 'Arquitecta');
  const employee = readAdminSession(loginResponse({ role: 'Empleado', roles: ['Empleado'], permissions: EMPLOYEE_PERMISSIONS }));
  assert.equal(employee.user.role, 'Empleado');
});

test('conserva las cuentas antiguas con rol admin', () => {
  const legacy = readAdminSession(loginResponse({ role: 'admin', roles: ['Administrador'], permissions: ['admin.all'] }));
  assert.equal(legacy.user.role, 'admin');
  assert.equal(adminRoleProfile(legacy.user).label, 'Administrador');
  // Si Django no envía `roles`, se usa el rol principal.
  assert.deepEqual(readAdminSession(loginResponse({ role: 'admin', permissions: ['admin.all'] })).user.roles, ['admin']);
});

test('rechaza respuestas de autenticación incompletas o sin permisos', () => {
  assert.throws(() => readAdminSession({ user: { role: 'Ingeniero', permissions: ['admin.all'] } }), TypeError);
  assert.throws(() => readAdminSession(loginResponse({ role: 'Ingeniero' })), TypeError);
  assert.throws(() => readAdminSession(loginResponse({ role: '', permissions: ['admin.all'] })), TypeError);
  assert.throws(() => readAdminSession(loginResponse({ role: 'Ingeniero', roles: 'Ingeniero', permissions: ['admin.all'] })), TypeError);
  assert.throws(
    () => readAdminSession(loginResponse({ role: 'Ingeniero', roles: ['Ingeniero'], permissions: [] })),
    (error) => error instanceof TypeError && error.code === 'no_panel_permissions',
  );
});

test('las secciones se habilitan con los permisos efectivos, no con el nombre del rol', () => {
  const engineer = { role: 'Ingeniero', permissions: ['admin.all'] };
  const architect = { role: 'Arquitecta', permissions: ARCHITECT_PERMISSIONS };
  const employee = { role: 'Empleado', permissions: EMPLOYEE_PERMISSIONS };
  const unseededEngineer = { role: 'Ingeniero', permissions: ['properties.create'] };

  for (const section of ['dashboard', 'news', 'inbox', 'properties']) assert.equal(canAccessAdminSection(engineer, section), true);
  for (const user of [architect, employee, unseededEngineer]) {
    assert.equal(canAccessAdminSection(user, 'dashboard'), true);
    assert.equal(canAccessAdminSection(user, 'news'), false);
    assert.equal(canAccessAdminSection(user, 'inbox'), false);
    assert.equal(canAccessAdminSection(user, 'properties'), true);
  }
  assert.equal(canAccessAdminSection(engineer, 'desconocida'), false);
  assert.equal(hasAdminPermission(engineer, 'properties.delete_permanently'), true);
  assert.equal(hasAdminPermission(architect, 'properties.delete_permanently'), false);
  assert.equal(hasAdminPermission(employee, 'properties.edit.own'), true);
  assert.equal(hasAdminPermission(null, 'admin.all'), false);
});

test('muestra el rol sin depender de mayúsculas o tildes', () => {
  assert.equal(adminRoleProfile({ role: 'ingeniero' }).label, 'Ingeniero');
  assert.equal(adminRoleProfile({ role: 'ARQUITECTA' }).description, 'Publicaciones de bienes raíces');
  assert.equal(adminRoleProfile({ role: 'Empleado' }).label, 'Empleado');
  assert.deepEqual(adminRoleProfile({ role: 'Supervisor', permissions: [] }), { label: 'Supervisor', description: 'Permisos personalizados' });
  assert.equal(adminRoleProfile(undefined).label, 'Sin rol');
});

test('lee colecciones paginadas de Django sin inventar datos', () => {
  const list = readAdminCollection({ count: 2, results: [{ id: '1' }] });
  assert.equal(list.items.length, 1);
  assert.equal(list.count, 2);
  assert.throws(() => readAdminCollection({ count: 4, data: [] }), TypeError);
});

test('los contadores faltantes no se presentan como cero', () => {
  assert.equal(displayAdminCount(undefined), '—');
  assert.equal(displayAdminCount(0), '0');
  assert.equal(displayAdminCount(17), '17');
  assert.equal(displayAdminCount(-1), '—');
});

test('los estados de solicitudes coinciden con el contrato de Django', () => {
  assert.deepEqual(Object.keys(inquiryStatuses), ['nuevo', 'atendido', 'archivado']);
  assert.equal(validInquiryStatus('nuevo'), true);
  assert.equal(validInquiryStatus('done'), false);
});

test('cada permiso fino habilita solo su sección y la papelera correspondiente', () => {
  const groups = {
    projects: ['create', 'edit.any', 'edit.own', 'publish', 'trash.any', 'trash.own', 'restore', 'delete_permanently'].map((p) => `projects.${p}`),
    properties: ARCHITECT_PERMISSIONS.concat(['properties.edit.own', 'properties.trash.own', 'properties.delete_permanently']),
    news: ['news.create', 'news.edit', 'news.publish', 'news.delete'],
    inbox: ['inquiries.read', 'inquiries.manage'],
    users: ['users.read', 'users.manage'], roles: ['roles.read', 'roles.manage'], history: ['audit.read'],
  };
  for (const [section, permissions] of Object.entries(groups)) {
    for (const permission of permissions) {
      const user = { permissions: [permission] };
      assert.equal(canAccessAdminSection(user, section), true, permission);
      for (const other of Object.keys(groups).filter((key) => key !== section)) {
        assert.equal(canAccessAdminSection(user, other), false, `${permission}: ${other}`);
      }
      assert.equal(canAccessAdminSection(user, 'trash'), /\.(trash\.(any|own)|restore|delete_permanently)$/.test(permission));
    }
  }
  for (const section of [...Object.keys(groups), 'trash', 'dashboard']) {
    assert.equal(canAccessAdminSection({ permissions: ['admin.all'] }, section), true);
  }
  const createOnly = { permissions: ['properties.create'] };
  assert.deepEqual(Object.keys(adminSectionPermissions).filter((section) => canAccessAdminSection(createOnly, section)), ['dashboard', 'properties']);
});

test('las rutas dinámicas y barras finales mantienen la sección sin confundir prefijos', () => {
  for (const path of ['/admin/bienes-raices', '/admin/bienes-raices/', '/admin/bienes-raices/nuevo', '/admin/bienes-raices/12/editar']) assert.equal(sectionForPath(path), 'properties');
  for (const path of ['/admin/proyectos', '/admin/proyectos/nuevo', '/admin/proyectos/casa-nueva/editar']) assert.equal(sectionForPath(path), 'projects');
  for (const path of ['/admin/roles', '/admin/roles/nuevo', '/admin/roles/12']) assert.equal(sectionForPath(path), 'roles');
  assert.equal(sectionForPath('/admin/'), 'dashboard');
  assert.equal(sectionForPath('/admin/papelera'), 'trash');
  assert.equal(sectionForPath('/admin/historial'), 'history');
  for (const path of ['/admin/login', '/admin/proyectos-ajenos', '/proyectos/casa', '/admin/desconocido']) assert.equal(sectionForPath(path), null);
});

test('actualizar usuario reemplaza permisos sin cambiar tokens ni aceptar otra identidad', () => {
  const session = readAdminSession(loginResponse({ role: 'Ingeniero', permissions: ['admin.all'] }));
  const next = refreshedAdminSession(session, { ...session.user, permissions: ['properties.create'], role: 'Empleado' });
  assert.equal(next.access, session.access);
  assert.equal(next.refresh, session.refresh);
  assert.deepEqual(next.user.permissions, ['properties.create']);
  assert.deepEqual(session.user.permissions, ['admin.all']);
  assert.equal(canAccessAdminSection(next.user, 'users'), false);
  assert.throws(() => refreshedAdminSession(session, { ...session.user, id: '2' }), TypeError);
  assert.throws(() => refreshedAdminSession(session, { ...session.user, permissions: [] }), /permisos/);
});
