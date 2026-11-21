import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Run the real component handler with synthetic state and service boundaries.
const artifact = await build({
  entryPoints: ['src/pages/app/OnboardingPage.tsx'],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  plugins: [{ name: 'isolated-onboarding', setup(build) {
    build.onResolve({ filter: /^(react(?:\/jsx-runtime)?|lucide-react|\.\.\/)/ }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react' ? `
        export const useState = initial => {
          const state = globalThis.__onboarding;
          const index = state.index++;
          return [state.values[index] ?? initial, value => { state.values[index] = value; }];
        };
        export default {};
      ` : args.path === 'react/jsx-runtime' ? `
        export const jsx = (type, props) => ({ type, props }), jsxs = jsx;
      ` : args.path === 'lucide-react' ? 'export const Building2=0, MapPin=0, CheckCircle2=0, ArrowRight=0, Loader2=0;' :
      args.path.endsWith('/AuthContext') ? 'export const useAuth = () => ({ organization: globalThis.__onboarding.organization });' :
      args.path.endsWith('/ToastContext') ? `export const useToast = () => ({
        success: message => globalThis.__onboarding.success.push(message),
        error: message => globalThis.__onboarding.errors.push(message),
      });` : args.path === '../../services' ? `
        export const organizationsService = { update: async (...args) => {
          const s = globalThis.__onboarding; s.updates.push(args); return s.updateResult;
        } };
        export const coordinatorsService = { create: async (...args) => {
          const s = globalThis.__onboarding; s.creates.push(args); return s.createResult;
        } };
      ` : `export const ${args.path.split('/').at(-1)} = '${args.path.split('/').at(-1)}';`,
    }));
  } }],
});
const { OnboardingPage } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

async function finish(overrides = {}) {
  const state = globalThis.__onboarding = {
    index: 0, values: [2, 'Organização teste', 'bairro', 'Coordenação teste', '', '', false],
    organization: { id: 'tenant-test', settings: {} },
    updateResult: { data: { id: 'tenant-test' }, error: null },
    createResult: { data: { id: 'coordinator-test' }, error: null },
    updates: [], creates: [], success: [], errors: [], navigation: [], ...overrides,
  };
  const tree = OnboardingPage({ onNavigate: path => state.navigation.push(path) });
  function find(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Button' && node.props.isLoading !== undefined) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = find(child);
      if (match) return match;
    }
  }
  await find(tree).props.onClick();
  assert.equal(state.values[6], false, 'submission must stop loading');
  return state;
}

for (const service of ['update', 'create']) {
  test(`onboarding ${service} error prevents success and navigation`, async () => {
    const state = await finish({ [`${service}Result`]: { data: null, error: { message: 'Acesso negado sintético' } } });
    assert.deepEqual(state.success, []);
    assert.deepEqual(state.navigation, []);
    assert.match(state.errors[0], /Acesso negado sintético/);
    if (service === 'update') assert.deepEqual(state.creates, []);
  });
}

test('onboarding without organization cannot report completion or write', async () => {
  const state = await finish({ organization: null });
  assert.deepEqual(state.success, []);
  assert.deepEqual(state.navigation, []);
  assert.deepEqual(state.updates, []);
  assert.deepEqual(state.creates, []);
  assert.equal(state.errors.length, 1);
});

test('onboarding completes after both services confirm success', async () => {
  const state = await finish();
  assert.equal(state.updates.length, 1);
  assert.equal(state.creates.length, 1);
  assert.equal(state.creates[0][0].organization_id, 'tenant-test');
  assert.equal(state.success.length, 1);
  assert.deepEqual(state.navigation, ['/app/dashboard']);
  assert.deepEqual(state.errors, []);
});

test('onboarding can complete without optional coordinator', async () => {
  const state = await finish({ values: [2, 'Organização teste', 'bairro', '   ', '', '', false] });
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.creates, []);
  assert.equal(state.success.length, 1);
  assert.deepEqual(state.navigation, ['/app/dashboard']);
});
