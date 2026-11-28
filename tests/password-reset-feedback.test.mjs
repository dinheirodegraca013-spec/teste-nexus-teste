import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { ForgotPasswordPage } from './src/pages/public/ForgotPasswordPage';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  tsconfigRaw: { compilerOptions: { jsx: 'react' } },
  plugins: [{ name: 'mock-password-reset-boundaries', setup(build) {
    build.onResolve({ filter: /^(react|lucide-react)$|contexts\/|components\/ui\// }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => {
      if (path === 'react') return { contents: `
        export const useState = () => {
          const index = globalThis.__reset.index++;
          return [globalThis.__reset.state[index], value => { globalThis.__reset.state[index] = value; }];
        };
        export default { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
      ` };
      if (path.includes('AuthContext')) return { contents: 'export const useAuth = () => ({ resetPassword: globalThis.__reset.request });' };
      if (path.includes('ToastContext')) return { contents: `export const useToast = () => ({
        success: message => globalThis.__reset.success.push(message),
        error: message => globalThis.__reset.errors.push(message),
      });` };
      return { contents: 'export const Mail = "mail", ArrowRight = "right", ArrowLeft = "left", Button = "button", Input = "input";' };
    });
  } }],
});
const { ForgotPasswordPage } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);
function findForm(node) {
  if (node?.type === 'form') return node;
  for (const child of node?.props?.children?.flat(Infinity) || []) {
    const found = findForm(child);
    if (found) return found;
  }
}
async function submit(request) {
  const state = globalThis.__reset = { index: 0, state: [' test@example.invalid ', false, false], success: [], errors: [], request };
  const form = findForm(ForgotPasswordPage({ onNavigate() {} }));
  await form.props.onSubmit({ preventDefault() {} });
  return state;
}
test('password reset does not confirm delivery when Auth returns an error', async () => {
  const state = await submit(async () => ({ error: new Error('synthetic provider failure') }));
  assert.equal(state.state[2], false);
  assert.equal(state.state[1], false);
  assert.equal(state.success.length, 0);
  assert.equal(state.errors.length, 1);
});
test('password reset recovers loading state when the request rejects', async () => {
  const state = await submit(async () => { throw new Error('synthetic network failure'); });
  assert.equal(state.state[1], false);
  assert.equal(state.state[2], false);
  assert.equal(state.success.length, 0);
  assert.equal(state.errors.length, 1);
});
test('password reset confirms an accepted request and trims the email', async () => {
  const state = await submit(async email => {
    assert.equal(email, 'test@example.invalid');
    return { error: null };
  });
  assert.equal(state.state[1], false);
  assert.equal(state.state[2], true);
  assert.equal(state.success.length, 1);
  assert.equal(state.errors.length, 0);
});
