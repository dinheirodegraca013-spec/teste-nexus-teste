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
        export const supabase = { auth: { signUp: (...args) => globalThis.__authProfileTest.signUp(...args), signInWithPassword: (...args) => globalThis.__authProfileTest.signIn(...args), updateUser: (...args) => globalThis.__authProfileTest.updateUser(...args), resetPasswordForEmail: (...args) => globalThis.__authProfileTest.resetPassword(...args), signOut: async () => globalThis.__authProfileTest.signOut?.() ?? { error: null }, getSession: () => globalThis.__authProfileTest.session(), onAuthStateChange: callback => { globalThis.__authProfileTest.onChange = callback; return { data: { subscription: { unsubscribe() {} } } }; } }, rpc: (...args) => globalThis.__authProfileTest.rpc(...args) };
        export const isSupabaseConfigured = true, supabaseUrl = '';
      ` : `
        export const profilesService = { getById: (...args) => globalThis.__authProfileTest.lookup(...args) };
        export const organizationsService = {
          getById: async id => globalThis.__authProfileTest.organization ? globalThis.__authProfileTest.organization(id) : ({ data: { id }, error: null }),
          getAll: async () => ({ data: [], error: null }),
        }, permissionsService = { getByUserId: async id => ({ data: [{ user_id: id, module: 'crm', can_view: true }], error: null }) };
        export const isValidUUID = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      `,
    }));
  } }],
});
const bundled = result.outputFiles[0].text;
const { AuthProvider, callbacks, states, effects } = await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`);

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

test('invited tenant attempts safe claim even when role metadata is missing', async () => {
  let rpcCalls = 0;
  globalThis.__authProfileTest = {
    lookup: async () => ({ data: null, error: null }),
    rpc: async name => {
      assert.equal(name, 'nexus_claim_preapproved_team_membership');
      rpcCalls++;
      return { data: false, error: null };
    },
  };
  callbacks.length = 0;
  states.length = 0;
  AuthProvider({ children: null });
  await callbacks[0]({
    id: 'synthetic-invite-user',
    user_metadata: { organization_id: '10000000-0000-4000-8000-000000000001' },
  });
  assert.equal(rpcCalls, 1);
  assert.match(states[7], /perfil ainda não foi provisionado/);
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
    assert.equal(states[5][0].user_id, 'user-b');
    assert.equal(states[7], null);
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
    assert.deepEqual(states[5], []);
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
        assert.equal(states[8], null);
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
    assert.equal(states[5][0].user_id, 'user-a');
    assert.equal(states[6], false);
    assert.equal(states[8], null);
  } finally {
    cleanup();
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

for (const event of ['SIGNED_OUT', 'SIGNED_IN']) {
  for (const outcome of ['session', 'error', 'rejection']) {
    test(`refresh getSession late ${outcome} cannot override ${event}`, async () => {
      let release, reject;
      const pending = new Promise((resolve, fail) => { release = resolve; reject = fail; });
      let sessionCalls = 0;
      const lookups = [];
      globalThis.__authProfileTest = {
        session: () => ++sessionCalls === 1
          ? Promise.resolve({ data: { session: null }, error: null }) : pending,
        lookup: async id => {
          lookups.push(id);
          return { data: { id, organization_id: 'tenant-b', role: 'viewer' }, error: null };
        },
      };
      callbacks.length = states.length = effects.length = 0;
      AuthProvider({ children: null });
      const cleanup = effects[0]();
      try {
        await new Promise(resolve => setImmediate(resolve));
        const refreshing = globalThis.__authContext.refreshUserData();
        const nextSession = event === 'SIGNED_OUT' ? null : { user: { id: 'user-b' } };
        await globalThis.__authProfileTest.onChange(event, nextSession);
        if (outcome === 'rejection') reject(new Error('Stale refresh rejection'));
        else release(outcome === 'error'
          ? { data: null, error: new Error('Stale refresh failure') }
          : { data: { session: { user: { id: 'user-a' } } }, error: null });
        await refreshing;
        assert.deepEqual(lookups, event === 'SIGNED_OUT' ? [] : ['user-b']);
        assert.deepEqual(states[0], nextSession?.user || null);
        assert.deepEqual(states[1], nextSession);
        assert.equal(states[2]?.id || null, nextSession?.user.id || null);
        assert.equal(states[3]?.id || null, nextSession ? 'tenant-b' : null);
        assert.equal(states[8], null);
      } finally {
        cleanup();
        delete globalThis.__authProfileTest;
        delete globalThis.__authContext;
      }
    });
  }
}

test('refresh without a newer event loads the recovered session', async () => {
  globalThis.__authProfileTest = {
    session: async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null }),
    lookup: async id => ({ data: { id, organization_id: 'tenant-a', role: 'viewer' }, error: null }),
  };
  callbacks.length = states.length = effects.length = 0;
  AuthProvider({ children: null });
  await globalThis.__authContext.refreshUserData();
  assert.equal(states[0].id, 'user-a');
  assert.equal(states[2].id, 'user-a');
  assert.equal(states[5][0].user_id, 'user-a');
  assert.equal(states[6], false);
  delete globalThis.__authProfileTest;
  delete globalThis.__authContext;
});

for (const hasSession of [false, true]) {
  test(`refresh reports returned session error (session present: ${hasSession})`, async () => {
    const failure = new Error('Synthetic session recovery failure');
    let lookups = 0;
    globalThis.__authProfileTest = {
      session: async () => ({
        data: { session: hasSession ? { user: { id: 'user-a' } } : null },
        error: failure,
      }),
      lookup: async () => {
        lookups++;
        return { data: { id: 'user-a', organization_id: 'tenant-a', role: 'viewer' }, error: null };
      },
    };
    callbacks.length = states.length = effects.length = 0;
    AuthProvider({ children: null });
    try {
      await globalThis.__authContext.refreshUserData();
      assert.equal(states[8], failure.message);
      assert.equal(states[6], false);
      assert.equal(lookups, 0);
      assert.equal(states[0], null);
      assert.equal(states[1], null);
      assert.equal(states[2], null);
      assert.equal(states[3], null);
      assert.deepEqual(states[5], []);
    } finally {
      delete globalThis.__authProfileTest;
      delete globalThis.__authContext;
    }
  });
}


test('password recovery targets the existing reset page on the current origin', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://nexus-test.invalid' } };
  let received;
  globalThis.__authProfileTest = {
    resetPassword: async (...args) => { received = args; return { error: null }; },
  };
  callbacks.length = states.length = effects.length = 0;
  AuthProvider({ children: null });
  try {
    assert.deepEqual(await globalThis.__authContext.resetPassword(' test@example.invalid '), { error: null });
    assert.deepEqual(received, ['test@example.invalid', {
      redirectTo: 'https://nexus-test.invalid/redefinir-senha',
    }]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

test('password update requires Auth to return the updated user', async () => {
  const providerError = new Error('Synthetic provider failure');
  let response;
  globalThis.__authProfileTest = {
    updateUser: async payload => {
      assert.deepEqual(payload, { password: 'synthetic-password' });
      return response;
    },
  };
  try {
    AuthProvider({ children: null });
    const { updatePassword } = globalThis.__authContext;
    response = { data: { user: null }, error: null };
    assert.match((await updatePassword('synthetic-password')).error?.message ?? '', /não confirmou/);

    response = { data: { user: {} }, error: null };
    assert.match((await updatePassword('synthetic-password')).error?.message ?? '', /não confirmou/);

    response = { data: { user: { id: 'synthetic-user' } }, error: null };
    assert.equal((await updatePassword('synthetic-password')).error, null);

    response = { data: { user: null }, error: providerError };
    assert.equal((await updatePassword('synthetic-password')).error, providerError);
  } finally {
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

test('logout clears local access state when Auth throws', async () => {
  const providerError = new Error('Synthetic logout failure');
  globalThis.__authProfileTest = {
    signOut: () => { throw providerError; },
  };
  callbacks.length = states.length = effects.length = 0;
  try {
    AuthProvider({ children: null });
    for (const index of [0, 1, 2, 3]) states[index] = { id: 'synthetic' };
    states[5] = [{ user_id: 'synthetic' }];

    assert.equal((await globalThis.__authContext.signOut()).error, providerError);
    assert.deepEqual(states.slice(0, 4), [null, null, null, null]);
    assert.deepEqual(states[5], []);
  } finally {
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

test('rejected login clears local session when provider logout throws', async () => {
  const user = { id: '11111111-1111-4111-8111-111111111111', user_metadata: {} };
  const providerError = new Error('Synthetic logout failure');
  globalThis.__authProfileTest = {
    signIn: async () => ({ data: { user, session: { user } }, error: null }),
    lookup: async () => ({ data: null, error: new Error('Synthetic profile lookup failure') }),
    signOut: () => { throw providerError; },
  };
  callbacks.length = states.length = effects.length = 0;
  try {
    AuthProvider({ children: null });
    const { error } = await globalThis.__authContext.signIn('test@example.invalid', 'synthetic-password');
    assert.deepEqual(states.slice(0, 4), [null, null, null, null]);
    assert.deepEqual(states[4], []);
    assert.deepEqual(states[5], []);
    assert.match(error.message, /Acesso bloqueado/);
  } finally {
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

test('invited signup confirms the invited organization before reporting success', async () => {
  const user = { id: '11111111-1111-4111-8111-111111111111', user_metadata: {} };
  const invitedOrgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherOrgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let profileOrgId = otherOrgId;
  let signOuts = 0;
  let blocked = false;
  globalThis.__authProfileTest = {
    signUp: async () => ({ data: { user, session: { user } }, error: null }),
    lookup: async () => ({ data: { id: user.id, organization_id: profileOrgId, role: 'viewer', is_blocked: blocked }, error: null }),
    signOut: () => { signOuts++; },
    rpc: () => assert.fail('Invited signup must not provision an organization'),
  };
  callbacks.length = states.length = effects.length = 0;
  try {
    AuthProvider({ children: null });
    const { signUp } = globalThis.__authContext;
    const params = {
      name: 'Synthetic User',
      email: 'test@example.invalid',
      password: 'synthetic-password',
      organizationId: invitedOrgId.toUpperCase(),
    };
    const rejected = await signUp(params);
    assert.match(rejected.error?.message ?? '', /organização do convite/);
    assert.deepEqual(states.slice(0, 4), [null, null, null, null]);
    assert.deepEqual(states[5], []);
    assert.equal(signOuts, 1);

    profileOrgId = invitedOrgId;
    assert.deepEqual(await signUp(params), { error: null, requiresConfirmation: false, user });
    assert.equal(signOuts, 1);

    blocked = true;
    const blockedSignup = await signUp(params);
    assert.match(blockedSignup.error?.message ?? '', /bloqueado/);
    assert.deepEqual(states.slice(0, 4), [null, null, null, null]);
    assert.deepEqual(states[5], []);
    assert.equal(signOuts, 2);
  } finally {
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});

test('signup requires a user ID before reporting that confirmation was sent', async () => {
  const user = { id: '11111111-1111-4111-8111-111111111111' };
  let returnedUser = {};
  let session = null;
  let signOuts = 0;
  globalThis.__authProfileTest = {
    signUp: async () => ({ data: { user: returnedUser, session }, error: null }),
    signOut: () => { signOuts++; },
  };
  callbacks.length = states.length = effects.length = 0;
  try {
    AuthProvider({ children: null });
    const { signUp } = globalThis.__authContext;
    const params = {
      name: 'Synthetic User',
      email: 'test@example.invalid',
      password: 'synthetic-password',
    };

    const rejected = await signUp(params);
    assert.match(rejected.error?.message ?? '', /não confirmou a criação da conta/);
    assert.equal(rejected.requiresConfirmation, undefined);

    session = { user };
    const rejectedWithSession = await signUp(params);
    assert.match(rejectedWithSession.error?.message ?? '', /não confirmou a criação da conta/);
    assert.equal(signOuts, 1);
    assert.deepEqual(states.slice(0, 4), [null, null, null, null]);

    session = null;
    returnedUser = user;
    assert.deepEqual(await signUp(params), { error: null, requiresConfirmation: true, user });
  } finally {
    delete globalThis.__authProfileTest;
    delete globalThis.__authContext;
  }
});
