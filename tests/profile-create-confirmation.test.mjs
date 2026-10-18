import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { profilesService } from './src/services/coreServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-profile-create',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { from() { return {
          insert() { return { select() { return { maybeSingle: async () => globalThis.__nexusProfileCreate.outcome }; } }; }
        }; } };
      ` }));
    },
  }],
});
const { profilesService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);
const orgId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000002';

test('zero-row profile create must not report success', async () => {
  globalThis.__nexusProfileCreate = { outcome: { data: null, error: null } };
  const result = await profilesService.create({ id: userId, organization_id: orgId, name: 'Teste', email: 'teste@example.com' });
  assert.equal(result.data, null);
  assert.equal(result.error?.code, 'PROFILE_CREATE_NOT_CONFIRMED');
});

test('confirmed profile create returns the persisted row', async () => {
  globalThis.__nexusProfileCreate = { outcome: { data: { id: userId, organization_id: orgId, name: 'Teste' }, error: null } };
  const result = await profilesService.create({ id: userId, organization_id: orgId, name: 'Teste', email: 'teste@example.com' });
  assert.equal(result.error, null);
  assert.equal(result.data?.id, userId);
});
