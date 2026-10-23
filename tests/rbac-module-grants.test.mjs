import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export { checkUserPermission, getDefaultRouteForUser, canAccessPrivilegedRoute } from './src/contexts/AuthContext';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  define: { 'import.meta.env': '{}' },
});
const esm = bundle.outputFiles[0].text.replace(
  /from "([^./][^"]*)"/g, (_, pkg) => `from ${JSON.stringify(import.meta.resolve(pkg))}`
);
const { checkUserPermission, getDefaultRouteForUser, canAccessPrivilegedRoute } = await import(
  `data:text/javascript;base64,${Buffer.from(esm).toString('base64')}`
);

const permission = (module, overrides={}) => ({
  module, can_view: true, can_create: false, can_edit: false, can_delete: false,
  ...overrides,
});

for (const role of ['leader', 'coordinator', 'controller']) {
  test(`${role}: does not bypass explicitly revoked CRM module permission`, () => {
    const profile = { role, is_blocked: false };
    assert.equal(checkUserPermission(profile, [], 'crm', 'view'), false);
    assert.equal(checkUserPermission(profile, [permission('crm', { can_view: false })], 'crm', 'view'), false);
    assert.equal(checkUserPermission(profile, [permission('crm')], 'crm', 'view'), true);
  });
  test(`${role}: UI never offers writes before matching database RLS exists`, () => {
    const profile = { role, is_blocked: false };
    const all = [permission('crm', { can_create: true, can_edit: true, can_delete: true })];
    for (const action of ['create', 'edit', 'delete']) {
      assert.equal(checkUserPermission(profile, all, 'crm', action), false);
    }
  });
}
test('coordinator honors an explicit grant for any configured module', () => {
  const profile = { role: 'coordinator', is_blocked: false };
  for (const module of ['materials', 'goals', 'events', 'meetings', 'stickers']) {
    assert.equal(checkUserPermission(profile, [permission(module)], module, 'view'), true);
  }
});
test('without any saved grants, leader defaults to forbidden route', () => {
  const profile = { role: 'leader', is_blocked: false };
  assert.equal(getDefaultRouteForUser(profile, []), '/403');
});
test('coordinator with explicit read access sees coordinator module but not unrelated module', () => {
  const profile = { role: 'coordinator', is_blocked: false };
  const perms = [permission('coordinators')];
  assert.equal(checkUserPermission(profile, perms, 'coordinators', 'view'), true);
  assert.equal(checkUserPermission(profile, perms, 'materials', 'view'), false);
});
test('non-admin cannot write server-admin-only operational tables even with stored grant', () => {
  for (const role of ['manager', 'operator', 'viewer']) {
    const profile = { role, is_blocked: false };
    const p = [permission('goals', { can_create: true, can_edit: true, can_delete: true })];
    assert.equal(checkUserPermission(profile, p, 'goals', 'view'), true);
    for (const action of ['create', 'edit', 'delete']) {
      assert.equal(checkUserPermission(profile, p, 'goals', action), false);
    }
  }
});

test('onboarding and plans are restricted to administrators', () => {
  for (const role of ['leader', 'coordinator', 'controller', 'viewer']) {
    const profile = { role, is_blocked: false };
    assert.equal(canAccessPrivilegedRoute(profile, '/app/onboarding'), false);
    assert.equal(canAccessPrivilegedRoute(profile, '/app/planos'), false);
  }
  for (const role of ['admin', 'superadmin']) {
    const profile = { role, is_blocked: false };
    assert.equal(canAccessPrivilegedRoute(profile, '/app/onboarding'), true);
    assert.equal(canAccessPrivilegedRoute(profile, '/app/planos'), true);
  }
});

test('ordinary private routes remain available to their module gate', () => {
  const profile = { role: 'viewer', is_blocked: false };
  assert.equal(canAccessPrivilegedRoute(profile, '/app/perfil'), true);
});
