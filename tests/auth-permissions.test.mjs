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
const { checkUserPermission, getDefaultRouteForUser, normalizeProfile } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

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
