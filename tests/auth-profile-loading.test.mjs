import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise AuthProvider's actual loading callback with isolated hooks and services.
// No Supabase client, browser session, credentials or network are used.
const result = await build({
  stdin: { contents: "export { AuthProvider } from './src/contexts/AuthContext'; export { callbacks, states } from 'react';", resolveDir: process.cwd() },
  bundle: true, write: false,
  platform: 'node', format: 'esm', jsx: 'transform',
  plugins: [{ name: 'isolated-auth', setup(build) {
    build.onResolve({ filter: /^(react(?:\/jsx-runtime)?|\.\.\/lib\/supabase|\.\.\/services)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react/jsx-runtime' ? 'export const jsx = () => null, jsxs = jsx;' : args.path === 'react' ? `
        export const callbacks = [], states = [];
        export const createContext = () => ({ Provider: {} });
        export const useContext = () => null;
        export const useEffect = () => {};
        export const useCallback = fn => { callbacks.push(fn); return fn; };
        export const useRef = value => ({ current: value });
        export const useState = value => {
          const index = states.push(value) - 1;
          return [value, next => { states[index] = next; }];
        };
        export default { useRef, createElement: () => null };
      ` : args.path.endsWith('/supabase') ? `
        export const supabase = { rpc: (...args) => globalThis.__authProfileTest.rpc(...args) };
        export const isSupabaseConfigured = true, supabaseUrl = '';
      ` : `
        export const profilesService = { getById: (...args) => globalThis.__authProfileTest.lookup(...args) };
        export const organizationsService = {}, permissionsService = {};
        export const isValidUUID = () => false;
      `,
    }));
  } }],
});
const bundled = result.outputFiles[0].text;
const { AuthProvider, callbacks, states } = await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`);

for (const kind of ['returned error', 'rejected request', 'timeout']) {
  test(`profile ${kind} clears cached access without provisioning`, async () => {
    const failure = new Error('Profile lookup unavailable');
    if (kind === 'timeout') failure.name = 'TimeoutError';
    let rpcCalls = 0;
    globalThis.__authProfileTest = {
      lookup: async () => {
        if (kind !== 'returned error') throw failure;
        return { data: null, error: failure };
      },
      rpc: () => { rpcCalls++; throw new Error('Provisioning must not run'); },
    };
    callbacks.length = 0;
    states.length = 0;
    AuthProvider({ children: null });
    // Model a previously loaded administrator and tenant before a refresh fails.
    states[2] = { role: 'admin' };
    states[3] = { id: 'old-tenant' };
    states[4] = [{ id: 'old-tenant' }];
    states[5] = [{ module: 'crm', can_view: true }];
    const loaded = await callbacks[0]({ id: 'synthetic-user', user_metadata: {} });
    assert.deepEqual(loaded, { profile: null, organization: null, permissions: [] });
    assert.equal(rpcCalls, 0);
    assert.equal(states[2], null);
    assert.equal(states[3], null);
    assert.deepEqual(states[4], []);
    assert.deepEqual(states[5], []);
    assert.equal(states[7], failure.message);
    assert.equal(states[8], failure.message);
    delete globalThis.__authProfileTest;
  });
}

test('confirmed missing profile still reaches existing provisioning flow', async () => {
  let rpcCalls = 0;
  globalThis.__authProfileTest = {
    lookup: async () => ({ data: null, error: null }),
    rpc: async () => { rpcCalls++; return { data: null, error: new Error('Synthetic provisioning stop') }; },
  };
  callbacks.length = 0;
  states.length = 0;
  AuthProvider({ children: null });
  await callbacks[0]({ id: 'synthetic-user', user_metadata: {} });
  assert.equal(rpcCalls, 1);
  assert.match(states[7], /Synthetic provisioning stop/);
  delete globalThis.__authProfileTest;
});
