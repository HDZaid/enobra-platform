import assert from 'node:assert/strict';
import test from 'node:test';
import { adminRoleProfile, canAccessAdminSection, displayAdminCount, hasAdminPermission, inquiryStatuses, readAdminCollection, readAdminSession, validInquiryStatus } from '../src/features/admin/utils/adminData.js';

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
