import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { LoginPage } from './src/pages/public/LoginPage';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  tsconfigRaw: { compilerOptions: { jsx: 'react' } },
  plugins: [{ name: 'mock-login-boundaries', setup(build) {
    build.onResolve({ filter: /^(react|lucide-react)$|contexts\/|components\/ui\// }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => {
      if (path === 'react') return { contents: `
        export const useState = () => {
          const index = globalThis.__loginPrivacy.index++;
          return [globalThis.__loginPrivacy.state[index], value => { globalThis.__loginPrivacy.state[index] = value; }];
        };
        export default { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
      ` };
      if (path.includes('AuthContext')) return { contents: 'export const useAuth = () => ({ signIn: globalThis.__loginPrivacy.request, getDefaultRoute: () => "/app/dashboard" });' };
      if (path.includes('ToastContext')) return { contents: `export const useToast = () => ({
        success: message => globalThis.__loginPrivacy.success.push(message),
        error: message => globalThis.__loginPrivacy.errors.push(message),
      });` };
      return { contents: 'export const Mail = "mail", Lock = "lock", ArrowRight = "right", ShieldCheck = "shield", AlertCircle = "alert", Button = "button", Input = "input";' };
    });
  } }],
});
const { LoginPage } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);
function findForm(node) {
  if (node?.type === 'form') return node;
  for (const child of node?.props?.children?.flat(Infinity) || []) {
    const found = findForm(child);
    if (found) return found;
  }
}

for (const email of ['a@example.invalid', 'operator@example.invalid']) {
  test(`login does not log credentials or email (${email})`, async () => {
    const password = 'Synthetic-password-123';
    const state = globalThis.__loginPrivacy = {
      index: 0, state: [email, password, false, ''], success: [], errors: [],
      request: async (actualEmail, actualPassword) => {
        assert.equal(actualEmail, email);
        assert.equal(actualPassword, password);
        return { error: null, defaultRoute: '/app/dashboard' };
      },
    };
    const navigations = [];
    const logs = [];
    const originalLog = console.log;
    try {
      console.log = (...args) => logs.push(args);
      const form = findForm(LoginPage({ onNavigate: (...args) => navigations.push(args) }));
      await form.props.onSubmit({ preventDefault() {} });
    } finally {
      console.log = originalLog;
    }
    assert.equal(state.state[2], false);
    assert.equal(state.success.length, 1);
    assert.deepEqual(navigations, [['/app/dashboard', { replace: true }]]);
    assert.ok(logs.some(([event]) => event === '[NEXUS FLOW] LOGIN_SUCCESS'));
    const serialized = JSON.stringify(logs);
    assert.ok(!serialized.includes('example.invalid'), 'Email domain must not appear in logs');
    assert.ok(!serialized.includes(password), 'Password must not appear in logs');
    assert.ok(!serialized.includes('"email"'), 'Email must not be a log field');
  });
}
