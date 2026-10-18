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
        export const supabase = { from() { return {
          upsert(rows) { globalThis.__nexusPermissions.rows = rows; return { select: async () => globalThis.__nexusPermissions.outcome }; }
        }; } };
      ` }));
    },
  }],
});
const { permissionsService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);
const permission = { user_id: '20000000-0000-4000-8000-000000000002', module: 'crm', can_view: true, can_create: false, can_edit: false, can_delete: false };

test('empty permission response must not report persistence', async () => {
  globalThis.__nexusPermissions = { outcome: { data: [], error: null } };
  const result = await permissionsService.upsertPermissions([permission]);
  assert.equal(result.data.length, 0);
  assert.equal(result.error?.code, 'PERMISSIONS_UPDATE_NOT_CONFIRMED');
});

test('partial permission response must not report all permissions persisted', async () => {
  globalThis.__nexusPermissions = { outcome: { data: [{ user_id: permission.user_id, module_key: 'crm', can_read: true, can_write: false, can_delete: false }], error: null } };
  const result = await permissionsService.upsertPermissions([permission, { ...permission, module: 'goals' }]);
  assert.equal(result.error?.code, 'PERMISSIONS_UPDATE_INCOMPLETE');
});
