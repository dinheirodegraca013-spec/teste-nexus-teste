import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { materialsService } from './src/services/dataServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-material-rpc',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { rpc: async (...args) => { globalThis.__nexusMaterialRpc.args = args; return globalThis.__nexusMaterialRpc.outcome; } };
      ` }));
    },
  }],
});
const { materialsService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

test('material distribution uses the atomic RPC and confirms its id', async () => {
  globalThis.__nexusMaterialRpc = { outcome: { data: 'distribution-id', error: null } };
  const result = await materialsService.distributeAtomically({
    material_id: '10000000-0000-4000-8000-000000000001', recipient_name: 'Equipe', territory: 'Centro', quantity: 2,
  });
  assert.equal(result.data, 'distribution-id');
  assert.equal(result.error, null);
  assert.deepEqual(globalThis.__nexusMaterialRpc.args, ['nexus_distribute_material', {
    p_material_id: '10000000-0000-4000-8000-000000000001', p_recipient_name: 'Equipe', p_territory: 'Centro', p_quantity: 2,
  }]);
});

test('material distribution does not report success when RPC returns no id', async () => {
  globalThis.__nexusMaterialRpc = { outcome: { data: null, error: null } };
  const result = await materialsService.distributeAtomically({
    material_id: '10000000-0000-4000-8000-000000000001', recipient_name: 'Equipe', territory: 'Centro', quantity: 2,
  });
  assert.equal(result.data, null);
  assert.equal(result.error?.code, 'MATERIAL_DISTRIBUTION_NOT_CONFIRMED');
});
