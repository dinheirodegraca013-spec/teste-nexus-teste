import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise AuthProvider's actual loading callback with isolated hooks and services.
// No Supabase client, browser session, credentials or network are used.
const result = await build({
  stdin: { contents: "export { AuthProvider } from './src/contexts/AuthContext'; export { callbacks, states, effects } from 'react';", resolveDir: process.cwd() },
  bundle: true, write: false,
  platform: 'node', format: 'esm', jsx: 'transform',
  plugins: [{ name: 'isolated-auth', setup(build) {
    build.onResolve({ filter: /^(react(?:\/jsx-runtime)?|\.\.\/lib\/supabase|\.\.\/services)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react/jsx-runtime' ? 'export const jsx = (_type, props) => { if (props.value) globalThis.__authContext = props.value; return null; }, jsxs = jsx;' : args.path === 'react' ? `
        export const callbacks = [], states = [], effects = [];
        export const createContext = () => ({ Provider: {} });
        export const useContext = () => null;
        export const useEffect = fn => { effects.push(fn); };
        export const useCallback = fn => { callbacks.push(fn); return fn; };
        export const useRef = value => ({ current: value });
        export const useState = value => {
          const index = states.push(value) - 1;
          return [value, next => { states[index] = next; }];
        };
        export default { useRef, createElement: (_type, props) => { if (props.value) globalThis.__authContext = props.value; return null; } };
      ` : args.path.endsWith('/supabase') ? `
        export const supabase = { auth: { signOut: async () => ({ error: null }), signInWithPassword: (...args) => globalThis.__authProfileTest.signIn(...args), getSession: () => (globalThis.__authProfileTest.getSession || globalThis.__authProfileTest.session)(), onAuthStateChange: callback => { globalThis.__authEvent = callback; globalThis.__authProfileTest.onChange = callback; return { data: { subscription: { unsubscribe() {} } } }; } }, rpc: (...args) => globalThis.__authProfileTest.rpc(...args) };
        export const isSupabaseConfigured = true, supabaseUrl = '';
      ` : `
        export const profilesService = { getById: (...args) => globalThis.__authProfileTest.lookup(...args) };
        export const organizationsService = {
          getById: async id => globalThis.__authProfileTest.organization ? globalThis.__authProfileTest.organization(id) : ({ data: { id }, error: null }),
          getAll: async () => ({ data: [], error: null }),
        }, permissionsService = { getByUserId: async id => ({ data: [{ user_id: id, module: 'crm', can_view: true }], error: null }) };
        export const isValidUUID = () => false;
      `,
    }));
  } }],
});
const bundled = result.outputFiles[0].text;
const { AuthProvider, callbacks, states, effects } = await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`);

test('late initial session cannot restore access after SIGNED_OUT', async () => {
  let releaseSession;
  const pending = new Promise(resolve => { releaseSession = resolve; });
  let lookups = 0;
  globalThis.__authProfileTest = {
    getSession: () => pending,
    lookup: async () => { lookups++; return { data: { id: 'old-user', role: 'admin' }, error: null }; },
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await globalThis.__authEvent('SIGNED_OUT', null);
  releaseSession({ data: { session: { user: { id: 'old-user' } } }, error: null });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  assert.equal(lookups, 0);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

test('late INITIAL_SESSION event does not restore user after SIGNED_OUT', async () => {
  globalThis.__authProfileTest = {
    getSession: async () => ({ data: { session: null }, error: null }),
    lookup: async () => { throw new Error('Unexpected profile lookup'); },
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  await globalThis.__authEvent('SIGNED_OUT', null);
  await globalThis.__authEvent('INITIAL_SESSION', { user: { id: 'old-user' } });
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

test('late refresh session cannot restore access after SIGNED_OUT', async () => {
  let releaseSession;
  const pending = new Promise(resolve => { releaseSession = resolve; });
  let calls = 0;
  globalThis.__authProfileTest = {
    getSession: () => ++calls === 1 ? Promise.resolve({ data: { session: null }, error: null }) : pending,
    lookup: async () => ({ data: { id: 'old-user', organization_id: 'old-tenant', role: 'admin' }, error: null }),
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  const refresh = globalThis.__authContext.refreshUserData();
  await globalThis.__authEvent('SIGNED_OUT', null);
  releaseSession({ data: { session: { user: { id: 'old-user' } } }, error: null });
  await refresh;
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  assert.equal(states[2], null);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

test('SIGNED_OUT during sign-in profile loading prevents successful access', async () => {
  let releaseProfile;
  const pending = new Promise(resolve => { releaseProfile = resolve; });
  const user = { id: 'old-user' };
  globalThis.__authProfileTest = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signIn: async () => ({ data: { user, session: { user } }, error: null }),
    lookup: () => pending,
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  const signingIn = globalThis.__authContext.signIn('test@example.invalid', 'synthetic');
  await new Promise(resolve => setImmediate(resolve));
  await globalThis.__authEvent('SIGNED_OUT', null);
  releaseProfile({ data: { id: 'old-user', organization_id: 'old-tenant', role: 'admin' }, error: null });
  const result = await signingIn;
  assert.ok(result.error);
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  assert.equal(states[2], null);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

test('SIGNED_OUT before sign-in response prevents stale login from restoring access', async () => {
  let releaseSignIn;
  const pending = new Promise(resolve => { releaseSignIn = resolve; });
  const user = { id: 'old-user' };
  globalThis.__authProfileTest = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signIn: () => pending,
    lookup: async () => ({ data: { id: user.id, organization_id: 'old-tenant', role: 'admin' }, error: null }),
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  const signingIn = globalThis.__authContext.signIn('test@example.invalid', 'synthetic');
  await globalThis.__authEvent('SIGNED_OUT', null);
  releaseSignIn({ data: { user, session: { user } }, error: null });
  const result = await signingIn;
  assert.ok(result.error);
  assert.equal(states[0], null);
  assert.equal(states[1], null);
  assert.equal(states[2], null);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

test('sign-in without a concurrent logout succeeds', async () => {
  const user = { id: 'current-user' };
  globalThis.__authProfileTest = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signIn: async () => ({ data: { user, session: { user } }, error: null }),
    lookup: async () => ({ data: { id: user.id, organization_id: 'current-tenant', role: 'admin' }, error: null }),
    rpc: () => { throw new Error('Unexpected provisioning'); },
  };
  callbacks.length = 0; states.length = 0; effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  const result = await globalThis.__authContext.signIn('test@example.invalid', 'synthetic');
  assert.equal(result.error, null);
  assert.equal(states[0].id, user.id);
  assert.equal(states[2].id, user.id);
  cleanup();
  delete globalThis.__authProfileTest;
  delete globalThis.__authEvent;
});

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
    states[4] = [{ module: 'crm', can_view: true }];
    const loaded = await callbacks[0]({ id: 'synthetic-user', user_metadata: {} });
    assert.deepEqual(loaded, { profile: null, organization: null, permissions: [] });
    assert.equal(rpcCalls, 0);
    assert.equal(states[2], null);
    assert.equal(states[3], null);
    assert.deepEqual(states[4], []);
    assert.equal(states[6], failure.message);
    assert.equal(states[7], failure.message);
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

for (const staleOutcome of ['profile', 'missing', 'error']) {
  test(`session B does not reuse session A or accept its late ${staleOutcome}`, async () => {
    let releaseA;
    const pendingA = new Promise(resolve => { releaseA = resolve; });
    const lookups = [];
    let rpcCalls = 0;
    globalThis.__authProfileTest = {
      lookup: id => {
        lookups.push(id);
        return id === 'user-a' ? pendingA : Promise.resolve({ data: { id, organization_id: 'tenant-b', role: 'viewer' }, error: null });
      },
      rpc: async () => { rpcCalls++; return { error: new Error('Unexpected provisioning') }; },
    };
    callbacks.length = 0;
    states.length = 0;
    AuthProvider({ children: null });
    const load = callbacks[1];
    const first = load({ id: 'user-a' });
    const duplicate = load({ id: 'user-a' });
    const second = load({ id: 'user-b' });
    // Release after B has had the opportunity to query, without hanging on a broken deduplicator.
    await new Promise(resolve => setImmediate(resolve));
    releaseA(staleOutcome === 'error'
      ? { data: null, error: new Error('Stale error') }
      : { data: staleOutcome === 'missing' ? null : { id: 'user-a', organization_id: 'tenant-a', role: 'admin' }, error: null });
    const [, , loadedB] = await Promise.all([first, duplicate, second]);
    assert.deepEqual(lookups, ['user-a', 'user-b']);
    assert.equal(loadedB.profile.id, 'user-b');
    assert.equal(states[2].id, 'user-b');
    assert.equal(states[3].id, 'tenant-b');
    assert.equal(states[4][0].user_id, 'user-b');
    assert.equal(states[6], null);
    assert.equal(rpcCalls, 0);
    delete globalThis.__authProfileTest;
  });
}

for (const stage of ['profile', 'organization']) {
  test(`logout discards a late ${stage} response`, async () => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    globalThis.__authProfileTest = {
      lookup: async () => stage === 'profile' ? pending : ({ data: { id: 'user-a', organization_id: 'tenant-a', role: 'admin' }, error: null }),
      organization: () => pending,
      rpc: () => { throw new Error('Unexpected provisioning'); },
    };
    callbacks.length = 0;
    states.length = 0;
    AuthProvider({ children: null });
    const loading = callbacks[1]({ id: 'user-a' });
    await new Promise(resolve => setImmediate(resolve));
    await globalThis.__authContext.signOut();
    release({ data: stage === 'profile' ? { id: 'user-a', role: 'admin' } : { id: 'tenant-a' }, error: null });
    const loaded = await loading;
    assert.equal(loaded.profile, null);
    assert.equal(states[2], null);
    assert.equal(states[3], null);
    assert.deepEqual(states[4], []);
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  });
}

for (const event of ['SIGNED_OUT', 'SIGNED_IN']) {
  for (const outcome of ['session', 'error', 'rejection']) {
    test(`initial getSession late ${outcome} cannot override ${event}`, async () => {
      let releaseSession, rejectSession;
      const pendingSession = new Promise((resolve, reject) => { releaseSession = resolve; rejectSession = reject; });
      const lookups = [];
      globalThis.__authProfileTest = {
        session: () => pendingSession,
        lookup: async id => {
          lookups.push(id);
          return { data: { id, organization_id: 'tenant-b', role: 'viewer' }, error: null };
        },
        rpc: () => { throw new Error('Unexpected provisioning'); },
      };
      callbacks.length = states.length = effects.length = 0;
      AuthProvider({ children: null });
      const cleanup = effects[0]();
      try {
        const nextSession = event === 'SIGNED_OUT' ? null : { user: { id: 'user-b' } };
        await globalThis.__authProfileTest.onChange(event, nextSession);
        if (outcome === 'rejection') rejectSession(new Error('Stale session rejection'));
        else releaseSession(outcome === 'error'
          ? { data: null, error: new Error('Stale session failure') }
          : { data: { session: { user: { id: 'user-a' } } }, error: null });
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(lookups, event === 'SIGNED_OUT' ? [] : ['user-b']);
        assert.deepEqual(states[0], nextSession?.user || null);
        assert.deepEqual(states[1], nextSession);
        assert.equal(states[2]?.id || null, nextSession?.user.id || null);
        assert.equal(states[3]?.id || null, nextSession ? 'tenant-b' : null);
        assert.equal(states[7], null);
      } finally {
        cleanup();
        delete globalThis.__authProfileTest;
        delete globalThis.__authContext;
      }
    });
  }
}

test('initial session without a newer event still loads access', async () => {
  globalThis.__authProfileTest = {
    session: async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null }),
    lookup: async id => ({ data: { id, organization_id: 'tenant-a', role: 'viewer' }, error: null }),
  };
  callbacks.length = states.length = effects.length = 0;
  AuthProvider({ children: null });
  const cleanup = effects[0]();
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(states[0].id, 'user-a');
    assert.equal(states[2].id, 'user-a');
    assert.equal(states[3].id, 'tenant-a');
    assert.equal(states[4][0].user_id, 'user-a');
    assert.equal(states[5], false);
    assert.equal(states[7], null);
  } finally {
    cleanup();
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});
