import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Isolated contract tests for organization updates; no network or database writes.
const artifact = await build({
  stdin: {
    contents: "export { organizationsService } from './src/services/coreServices';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-supabase-organizations',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({
        path: args.path, namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            from(table) {
              globalThis.__nexusOrgUpdate.calls.push(['from', table]);
              return {
                update(patch) {
                  globalThis.__nexusOrgUpdate.calls.push(['update', patch]);
                  return {
                    eq(column, value) {
                      globalThis.__nexusOrgUpdate.calls.push(['eq', column, value]);
                      return {
                        select() {
                          globalThis.__nexusOrgUpdate.calls.push('select');
                          return {
                            maybeSingle: async () => globalThis.__nexusOrgUpdate.outcome,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        `,
      }));
    },
  }],
});
const { organizationsService } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`
);
const id = '10000000-0000-4000-8000-000000000001';

function setup(outcome) {
  globalThis.__nexusOrgUpdate = { outcome, calls: [] };
  return globalThis.__nexusOrgUpdate;
}

test('zero-row organization update must not report success', async () => {
  const state = setup({ data: null, error: null });
  const result = await organizationsService.update(id, { name: 'Atualizada' });
  assert.equal(result.data, null);
  assert.equal(result.error?.code, 'ORGANIZATION_UPDATE_NOT_APPLIED');
  assert.deepEqual(state.calls, [
    ['from', 'organizations'],
    ['update', { name: 'Atualizada' }],
    ['eq', 'id', id],
    'select',
  ]);
});

test('confirmed organization update returns row', async () => {
  setup({ data: { id, name: 'Atualizada' }, error: null });
  const result = await organizationsService.update(id, { name: 'Atualizada' });
  assert.equal(result.error, null);
  assert.equal(result.data?.id, id);
});

test('organization update preserves Supabase errors', async () => {
  const err = { code: '42501', message: 'Sem permissão' };
  setup({ data: null, error: err });
  const result = await organizationsService.update(id, { name: 'Atualizada' });
  assert.equal(result.error, err);
});
