import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { permissionsService } from './src/services/coreServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-permissions',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { from(table) {
          globalThis.__permissionProbe.calls.push(['from', table]);
          return { upsert(rows, options) {
            globalThis.__permissionProbe.calls.push(['upsert', rows, options]);
            return { select: async () => globalThis.__permissionProbe.outcome };
          }};
        }};
      ` }));
    },
  }],
});
const { permissionsService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);
const userId = '10000000-0000-4000-8000-000000000001';
const payload = [
  { user_id: userId, module: 'crm', can_view: true },
  { user_id: userId, module: 'goals', can_view: false },
];
function setup(outcome) {
  globalThis.__permissionProbe = { outcome, calls: [] };
  return globalThis.__permissionProbe;
}

test('permission save rejects an RLS response with no persisted rows', async () => {
  setup({ data: [], error: null });
  const result = await permissionsService.upsertPermissions(payload);
  assert.equal(result.error?.code, 'PERMISSIONS_NOT_CONFIRMED');
});

test('permission save rejects a partial RLS response', async () => {
  setup({ data: [{ user_id: userId, module_key: 'crm', can_read: true }], error: null });
  const result = await permissionsService.upsertPermissions(payload);
  assert.equal(result.error?.code, 'PERMISSIONS_NOT_CONFIRMED');
});

test('permission save confirms every requested module', async () => {
  const probe = setup({ data: [
    { user_id: userId, module_key: 'crm', can_read: true, can_write: false, can_delete: false },
    { user_id: userId, module_key: 'goals', can_read: false, can_write: false, can_delete: false },
  ], error: null });
  const result = await permissionsService.upsertPermissions(payload);
  assert.equal(result.error, null);
  assert.equal(result.data.length, 2);
  assert.deepEqual(probe.calls[0], ['from', 'user_module_permissions']);
});

test('permission save rejects a full-size response with different values', async () => {
  setup({ data: [
    { user_id: userId, module_key: 'crm', can_read: false, can_write: false, can_delete: false },
    { user_id: userId, module_key: 'goals', can_read: false, can_write: false, can_delete: false },
  ], error: null });
  const result = await permissionsService.upsertPermissions(payload);
  assert.equal(result.error?.code, 'PERMISSIONS_NOT_CONFIRMED');
});

test('permission save rejects an empty request before querying Supabase', async () => {
  const probe = setup({ data: [], error: null });
  const result = await permissionsService.upsertPermissions([]);
  assert.equal(result.error?.code, 'PERMISSIONS_EMPTY');
  assert.deepEqual(probe.calls, []);
});

test('permission save rejects a partially invalid request before querying Supabase', async () => {
  const probe = setup({ data: [], error: null });
  const result = await permissionsService.upsertPermissions([payload[0], { user_id: userId }]);
  assert.equal(result.error?.code, 'PERMISSIONS_INVALID');
  assert.deepEqual(probe.calls, []);
});
