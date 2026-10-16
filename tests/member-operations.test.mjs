import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Unit tests use the real service implementation but no network / Supabase API.
const bundle = await build({
  stdin: {
    contents: "export { membersService, profilesService, teamScopeService } from './src/services/coreServices';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, (args) =>
        ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            functions: {
              invoke: async (...args) => {
                globalThis.__members.calls.push(['invoke', ...args]);
                return globalThis.__members.inviteResult;
              }
            },
            rpc: async (...args) => {
              globalThis.__members.calls.push(['rpc', ...args]);
              return globalThis.__members.rpcResult;
            },
            from: (...args) => {
              globalThis.__members.calls.push(['from', ...args]);
              throw Error('Direct table operation must not be used');
            },
          };
        `
      }));
    }
  }]
});
const { membersService, profilesService, teamScopeService } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const userId = '10000000-0000-4000-8000-000000000012';
const orgId = '10000000-0000-4000-8000-000000000001';
const scopeId = '10000000-0000-4000-8000-000000000021';
function setup(inviteResult = { data: null, error: null }) {
  globalThis.__members = {
    calls: [], inviteResult, rpcResult: { data: null, error: null },
  };
  return globalThis.__members;
}
const input = { organization_id: orgId, email: 'safe@example.invalid', role: 'operator', name: 'Teste' };

test('invite reports business-level failure rather than showing success', async () => {
  const state = setup({ data: { success: false, error: 'Rejected' }, error: null });
  const result = await membersService.invite(input);
  assert.equal(result.data, null);
  assert.equal(result.error.code, 'INVITATION_NOT_CONFIRMED');
  assert.match(result.error.message, /Rejected/);
  assert.equal(state.calls[0][0], 'invoke');
});

test('invite requires a confirmed member id', async () => {
  setup({ data: { success: true, member: {} }, error: null });
  const result = await membersService.invite(input);
  assert.equal(result.error.code, 'INVITATION_NOT_CONFIRMED');
});

test('invite reports success only for a confirmed created member', async () => {
  setup({ data: { success: true, member: {
    id: userId, name: 'Teste', organization_id: orgId, is_blocked: false,
  } }, error: null });
  const result = await membersService.invite(input);
  assert.equal(result.error, null);
  assert.equal(result.data.id, userId);
});

test('member removal fails closed instead of issuing an ineffective DELETE', async () => {
  const state = setup();
  const result = await membersService.remove(userId);
  assert.equal(result.error.code, 'MEMBER_REVOKE_NOT_IMPLEMENTED');
  assert.equal(state.calls.length, 0);
});

test('controller revocation uses audited RPC rather than direct private table', async () => {
  const state = setup();
  const result = await teamScopeService.revokeController(userId, scopeId);
  assert.equal(result.error, null);
  assert.deepEqual(state.calls, [['rpc', 'nexus_set_controller_scope', {
    p_controller_user: userId,
    p_coordinator: scopeId,
    p_enabled: false,
  }]]);
});

test('invalid scope identifiers never reach Supabase', async () => {
  const state = setup();
  const result = await teamScopeService.revokeController('invalid', scopeId);
  assert.ok(result.error);
  assert.equal(state.calls.length, 0);
});


test('direct profile deletion must never masquerade as account revocation', async () => {
  const state = setup();
  const result = await profilesService.delete(userId);
  assert.equal(result.error?.code, 'PROFILE_DELETE_FORBIDDEN');
  assert.deepEqual(state.calls, [], 'Auth membership cannot be revoked by deleting profile rows');
});
