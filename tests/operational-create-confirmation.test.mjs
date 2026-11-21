import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { goalsService } from './src/services/dataServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-operational-create',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { from() { return {
          insert() { return { select() { return { maybeSingle: async () => globalThis.__nexusOperationalCreate.outcome }; } }; }
        }; } };
      ` }));
    },
  }],
});
const { goalsService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

test('zero-row operational create must not report success', async () => {
  globalThis.__nexusOperationalCreate = { outcome: { data: null, error: null } };
  const result = await goalsService.create({ organization_id: '10000000-0000-4000-8000-000000000001', title: 'Meta' });
  assert.equal(result.data, null);
  assert.equal(result.error?.code, 'GOAL_CREATE_NOT_CONFIRMED');
});
