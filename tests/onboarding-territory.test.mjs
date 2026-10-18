import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { OnboardingPage } from './src/pages/app/OnboardingPage';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
  plugins: [{ name: 'onboarding-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(react(?:\/jsx-runtime)?|lucide-react|\.\.\/\.\.\/contexts\/AuthContext|\.\.\/\.\.\/contexts\/ToastContext|\.\.\/\.\.\/components\/ui\/(?:Button|Input|Select)|\.\.\/\.\.\/services)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react/jsx-runtime' ? `export const jsx = (type, props) => { const element = { type, props }; if (props?.onClick) globalThis.__onboarding.buttons.push(element); return element; }; export const jsxs = jsx;` :
      args.path === 'react' ? `export const useState = value => [globalThis.__onboarding.values.shift() ?? value, () => {}]; export default {};` :
      args.path === 'lucide-react' ? `export const Building2 = 'icon', MapPin = 'icon', CheckCircle2 = 'icon', ArrowRight = 'icon', Loader2 = 'icon';` :
      args.path.endsWith('/AuthContext') ? `export const useAuth = () => ({ organization: { id: 'tenant', name: 'Organização', settings: {} } });` :
      args.path.endsWith('/ToastContext') ? `export const useToast = () => ({ success: message => globalThis.__onboarding.success.push(message), error: message => globalThis.__onboarding.errors.push(message) });` :
      args.path.endsWith('/services') ? `export const organizationsService = { update: async (...args) => { globalThis.__onboarding.updates.push(args); return { error: null }; } }; export const coordinatorsService = { create: async data => { globalThis.__onboarding.creates.push(data); return { error: null }; } };` :
      `export const Button = 'Button', Input = 'Input', Select = 'Select';`,
    }));
  }}],
});
const { OnboardingPage } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

async function finish(name, territory) {
  const state = globalThis.__onboarding = { values: [2, 'Organização', 'bairro', name, '', territory, false], buttons: [], updates: [], creates: [], success: [], errors: [], navigation: [] };
  OnboardingPage({ onNavigate: path => state.navigation.push(path) });
  const submit = state.buttons.find(element => element.props.children === 'Concluir & Acessar');
  assert.ok(submit);
  await submit.props.onClick();
  return state;
}

test('onboarding does not save a fabricated territory when coordinator territory is empty', async () => {
  const state = await finish('Coordenadora', '   ');
  assert.equal(state.creates.length, 0);
  assert.equal(state.updates.length, 0);
  assert.equal(state.navigation.length, 0);
  assert.match(state.errors[0], /território/i);
});

test('onboarding can skip the optional coordinator', async () => {
  const state = await finish('', '');
  assert.equal(state.creates.length, 0);
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.navigation, ['/app/dashboard']);
});

test('onboarding saves the territory supplied for the coordinator', async () => {
  const state = await finish('Coordenadora', ' Bairro Alfa ');
  assert.equal(state.creates[0].territory, 'Bairro Alfa');
  assert.deepEqual(state.navigation, ['/app/dashboard']);
});
