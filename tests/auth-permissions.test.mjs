import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  stdin: { contents: "export * from './src/contexts/AuthContext'; export { normalizeProfile } from './src/services/coreServices';", resolveDir: process.cwd() }, bundle: true, write: false,
  platform: 'node', format: 'esm', packages: 'external',
  define: { 'import.meta.env': '{}' },
});
// Resolve external packages from this repository while keeping the bundle in memory.
const source = result.outputFiles[0].text.replace(/from "([^./][^"]*)"/g,
  (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { checkUserPermission, getDefaultRouteForUser, normalizeProfile, normalizeRole } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('missing profile has no access', () => {
  assert.equal(checkUserPermission(null, [], 'crm'), false);
});

test('operator without saved permissions has no access', () => {
  assert.equal(checkUserPermission({ role: 'operator' }, [], 'crm'), false);
});

test('blocked administrator cannot access modules', () => {
  assert.equal(checkUserPermission({ role: 'admin', is_blocked: true }, [], 'crm'), false);
});

test('blocked administrator is directed to forbidden page', () => {
  assert.equal(getDefaultRouteForUser({ role: 'admin', is_blocked: true }, []), '/403');
});

test('blocked database profile is displayed as inactive', () => {
  const profile = normalizeProfile({ id: 'test-profile', name: 'Test', is_blocked: true });
  assert.equal(profile.is_active, false);
  assert.equal(profile.status, 'inactive');
});

for (const role of ['superadmin', 'admin', 'manager', 'coordinator', 'controller', 'leader', 'operator', 'viewer']) {
  test(`blocked ${role} cannot use saved CRM permissions`, () => {
    const permissions = [{ module: 'crm', can_view: true, can_create: true, can_edit: true, can_delete: true }];
    for (const action of ['view', 'create', 'edit', 'delete']) {
      assert.equal(checkUserPermission({ role, is_blocked: true }, permissions, 'crm', action), false);
    }
    assert.equal(getDefaultRouteForUser({ role, is_blocked: true }, permissions), '/403');
  });
}

test('active operator retains only explicitly granted actions', () => {
  const profile = { role: 'operator', is_blocked: false };
  const permissions = [{ module: 'crm', can_view: true, can_create: false, can_edit: false, can_delete: false }];
  assert.equal(checkUserPermission(profile, permissions, 'crm', 'view'), true);
  assert.equal(checkUserPermission(profile, permissions, 'crm', 'delete'), false);
  assert.equal(checkUserPermission(profile, permissions, 'users', 'view'), false);
});

test('unblocked database profile is active and keeps its identity', () => {
  const profile = normalizeProfile({ id: 'test-profile', name: 'Test', is_blocked: false });
  assert.equal(profile.is_active, true);
  assert.equal(profile.status, 'active');
  assert.equal(profile.id, 'test-profile');
  assert.equal(profile.full_name, 'Test');
});

test('controlador is a distinct role and denied by default', () => {
  assert.equal(normalizeRole('Controlador'), 'controller');
  assert.equal(normalizeRole('controller'), 'controller');
  const profile = { role: 'controller', is_blocked: false };
  assert.equal(checkUserPermission(profile, [], 'crm', 'view'), false);
  assert.equal(checkUserPermission(profile, [], 'leaders', 'view'), false);
  assert.equal(checkUserPermission(profile, [], 'users', 'delete'), false);
});

test('controller only receives explicitly configured module actions', () => {
  const profile = { role: 'controller', is_blocked: false };
  const permissions = [{ module: 'leaders', can_view: true, can_create: false, can_edit: false, can_delete: false }];
  assert.equal(checkUserPermission(profile, permissions, 'leaders', 'view'), true);
  assert.equal(checkUserPermission(profile, permissions, 'leaders', 'edit'), false);
  assert.equal(checkUserPermission(profile, permissions, 'crm', 'view'), false);
});

for (const role of ['leader', 'coordinator']) {
  test(`${role} can read only modules covered by scoped DB RLS and cannot write`, () => {
    const profile = { role, is_blocked: false };
    const all = [{ module: 'crm', can_view: true, can_create: true, can_edit: true, can_delete: true }];
    for (const action of ['create','edit','delete']) {
      assert.equal(checkUserPermission(profile, all, 'crm', action), false);
      assert.equal(checkUserPermission(profile, all, 'presence', action), false);
    }
    assert.equal(checkUserPermission(profile, all, 'crm', 'view'), true);
    assert.equal(checkUserPermission(profile, all, 'presence', 'view'), true);
    assert.equal(checkUserPermission(profile, all, 'stickers', 'view'), false);
    assert.equal(checkUserPermission(profile, all, 'field', 'view'), false);
    assert.equal(checkUserPermission(profile, all, 'goals', 'view'), false);
  });
}

test('leader cannot list another coordinator and defaults to CRM', () => {
  const leader = { role: 'leader', is_blocked: false };
  assert.equal(checkUserPermission(leader, [], 'coordinators', 'view'), false);
  assert.equal(checkUserPermission(leader, [], 'leaders', 'view'), false);
  assert.equal(getDefaultRouteForUser(leader, []), '/app/crm');
});
