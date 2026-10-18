import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { LoginPage } from './src/pages/public/LoginPage'; export const render = () => renderToStaticMarkup(React.createElement(LoginPage, { onNavigate() {} }));`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  plugins: [{ name: 'auth-boundaries', setup(builder) {
    builder.onResolve({ filter: /^\.\.\/\.\.\/contexts\/(?:AuthContext|ToastContext)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path.endsWith('AuthContext')
      ? `export const useAuth = () => ({ signIn() {}, getDefaultRoute() {} });`
      : `export const useToast = () => ({ error() {}, success() {} });` }));
  }}],
});
const module = { exports: {} };
runInNewContext(artifact.outputFiles[0].text, { module, exports: module.exports, require: createRequire(import.meta.url), process, console, setTimeout, clearTimeout, queueMicrotask, Buffer, TextEncoder, TextDecoder });

test('login password input is associated with its visible label', () => {
  const html = module.exports.render();
  const input = html.match(/<input\b[^>]*type="password"[^>]*>/)?.[0];
  assert.ok(input, 'password input exists');
  const id = input.match(/\bid="([^"]+)"/)?.[1];
  assert.ok(id, 'password input has an id');
  assert.match(html, new RegExp(`<label\\b[^>]*for="${id}"[^>]*>Senha</label>`));
});
