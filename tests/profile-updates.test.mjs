import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Test the actual profilesService.update code with an isolated Supabase client.
// No network, secrets, users, or database writes occur in this test.
const artifact = await build({
  stdin: {
    contents: "export { profilesService } from './src/services/coreServices';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-supabase',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, (args) => ({
        path: args.path,
        namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            from(table) {
              globalThis.__nexusProfileUpdate.tables.push(table);
              return {
                update(patch) {
                  globalThis.__nexusProfileUpdate.patches.push(patch);
                  return {
                    eq(column, id) {
                      globalThis.__nexusProfileUpdate.filters.push({ column, id });
                      return {
                        select() {
                          return {
                            maybeSingle: async () => globalThis.__nexusProfileUpdate.outcome,
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
const { profilesService } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`
);
const profileId = '11111111-1111-4111-8111-111111111111';

function setup(outcome = { data: { id: profileId, name: 'Joana', is_blocked: false }, error: null }) {
  globalThis.__nexusProfileUpdate = {
    outcome, tables: [], patches: [], filters: [],
  };
  return globalThis.__nexusProfileUpdate;
}

for (const property of ['role', 'organization_id', 'email', 'is_blocked']) {
  test(`profile update rejects client-owned ${property}`, async () => {
    const state = setup();
    const { data, error } = await profilesService.update(profileId, { [property]: 'malicious' });
    assert.equal(data, null);
    assert.equal(error.code, 'PROTECTED_PROFILE_FIELDS');
    assert.deepEqual(state.tables, []);
  });
}

test('name and phone updates use only permitted columns and own id', async () => {
  const state = setup();
  const { data, error } = await profilesService.update(profileId, {
    full_name: '  Joana Silva  ',
    phone: '  (13) 90000-0000  ',
  });
  assert.equal(error, null);
  assert.equal(data.full_name, 'Joana');
  assert.deepEqual(state.tables, ['profiles']);
  assert.deepEqual(state.patches, [{ name: 'Joana Silva', phone: '(13) 90000-0000' }]);
  assert.deepEqual(state.filters, [{ column: 'id', id: profileId }]);
});

test('empty phone clears persisted value', async () => {
  const state = setup();
  await profilesService.update(profileId, { phone: '' });
  assert.deepEqual(state.patches, [{ phone: null }]);
});

test('RLS rejecting update without an error never results in success', async () => {
  setup({ data: null, error: null });
  const { data, error } = await profilesService.update(profileId, { name: 'Teste' });
  assert.equal(data, null);
  assert.equal(error.code, 'PROFILE_UPDATE_NOT_APPLIED');
});

test('invalid user id and invalid data fail before reaching Supabase', async () => {
  const state = setup();
  assert.equal((await profilesService.update('invalid-id', { name: 'Teste' })).error.code, 'INVALID_USER_UUID');
  assert.equal((await profilesService.update(profileId, { name: '' })).error.code, 'INVALID_PROFILE_NAME');
  assert.equal((await profilesService.update(profileId, { phone: '9'.repeat(33) })).error.code, 'INVALID_PROFILE_PHONE');
  assert.deepEqual(state.tables, []);
});
