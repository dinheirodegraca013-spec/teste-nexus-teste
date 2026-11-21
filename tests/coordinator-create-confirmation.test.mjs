import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Real service with a simulated Supabase boundary; no network or real fixtures.
const artifact = await build({
  stdin: {
    contents: "export { coordinatorsService } from './src/services/dataServices';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-coordinator-insert',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({
        path: args.path, namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            from(table) {
              globalThis.__coordinatorInsert.calls.push(['from', table]);
              return {
                insert(rows) {
                  globalThis.__coordinatorInsert.calls.push(['insert', rows]);
                  return {
                    select() {
                      globalThis.__coordinatorInsert.calls.push('select');
                      return { maybeSingle: async () => globalThis.__coordinatorInsert.outcome };
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
const { coordinatorsService } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`
);
const input = {
  name: 'Coordenação sintética',
  organization_id: '10000000-0000-4000-8000-000000000001',
};
function setup(outcome) {
  globalThis.__coordinatorInsert = { outcome, calls: [] };
  return globalThis.__coordinatorInsert;
}

test('coordinator creation without a returned row must not report success', async () => {
  const state = setup({ data: null, error: null });
  const result = await coordinatorsService.create(input);
  assert.equal(result.data, null);
  assert.equal(result.error?.code, 'COORDINATOR_CREATE_NOT_CONFIRMED');
  assert.deepEqual(state.calls, [['from', 'coordinators'], ['insert', [input]], 'select']);
});

test('confirmed coordinator creation preserves the returned row', async () => {
  const row = { ...input, id: '20000000-0000-4000-8000-000000000001' };
  setup({ data: row, error: null });
  const result = await coordinatorsService.create(input);
  assert.equal(result.data, row);
  assert.equal(result.error, null);
});

test('coordinator creation preserves the original Supabase error', async () => {
  const error = { code: '42501', message: 'Sem permissão' };
  setup({ data: null, error });
  const result = await coordinatorsService.create(input);
  assert.equal(result.data, null);
  assert.equal(result.error, error);
});
