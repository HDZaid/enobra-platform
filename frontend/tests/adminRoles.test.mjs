import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedRoleLabel, fixedRoleDescriptions, canEditManagedUser } from '../src/features/admin/utils/fixedRoles.js';
import { readUserRoles, canAssignUserRole } from '../src/features/admin/utils/users.js';
import { routePaths } from '../src/app/routePaths.js';
import { canAccessAdminSection, sectionForPath } from '../src/features/admin/utils/adminData.js';

test('tres etiquetas fijas conservan los IDs existentes y excluyen roles técnicos o personalizados', () => {
  const rows = [
    { id: 41, name: 'Ingeniero', active: true, permissions: ['admin.all'] },
    { id: 82, name: 'Arquitecta', active: true, permissions: [] },
    { id: 99, name: 'Empleado', active: true, permissions: [] },
    { id: 77, name: 'Técnico limpieza', active: true, permissions: [] },
  ];
  const options = readUserRoles(rows);
  assert.deepEqual(options.map((r) => [r.id, r.name]), [[41, 'Administrador'], [99, 'Empleado'], [82, 'Arquitecto']]);
  assert.ok(options.every((r) => r.description === fixedRoleDescriptions[r.name]));
  assert.equal(readUserRoles(rows.filter((r) => r.id !== 82)).length, 2);
  assert.equal(fixedRoleLabel('admin'), 'Administrador');
});
test('no existen rutas ni sección de roles, incluso con acceso completo', () => {
  assert.equal(Object.keys(routePaths).some((key) => key.startsWith('adminRole')), false);
  assert.equal(canAccessAdminSection({ permissions: ['admin.all'] }, 'roles'), false);
  assert.equal(sectionForPath('/admin/roles/nuevo'), null);
});
test('Arquitecto no puede reasignar roles ni editar una cuenta administradora', () => {
  const actor = { permissions: ['users.manage', 'users.read'] };
  const admin = { roles: [{ name: 'Ingeniero' }] };
  assert.equal(canAssignUserRole({ active: true, name: 'Empleado', permissions: [] }, actor), false);
  assert.equal(canEditManagedUser(actor, admin), false);
  assert.equal(canEditManagedUser(actor, { roles: [{ name: 'Empleado' }] }), true);
});
