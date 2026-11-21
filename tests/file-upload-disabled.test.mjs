import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/components/ui/FileUpload.tsx'],
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'transform', tsconfigRaw: { compilerOptions: { jsx: 'react' } },
  plugins: [{
    name: 'component-boundaries',
    setup(build) {
      build.onResolve({ filter: /^(react|lucide-react)$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'react' ? `
        export const useRef = value => globalThis.__uploadHooks ? globalThis.__uploadHooks.useRef(value) : ({ current: value });
        export const useState = value => [value, next => globalThis.__uploadHooks?.setState(next)];
        export const useEffect = (effect, deps) => globalThis.__uploadHooks?.useEffect(effect, deps);
        export const useId = () => 'upload-test';
        export default { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
      ` : 'export const UploadCloud = 0, Image = 0, X = 0, FileText = 0, Camera = 0, CheckCircle2 = 0;' }));
    },
  }],
});
const { FileUpload } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === 'button' ? [node] : []), ...(node.children || []).flat(Infinity).flatMap(buttons)];
}

for (const disabled of [true, false]) {
  test(`attachment removal respects disabled=${disabled}`, () => {
    const calls = [];
    const controls = buttons(FileUpload({
      value: 'data:image/jpeg;base64,synthetic', disabled,
      onChange: (...args) => calls.push(['change', ...args]),
      onFileRemoved: () => calls.push(['removed']),
    }));
    const remove = controls.find(node => node.props['aria-label'] === 'Remover arquivo');
    assert.ok(remove);
    // Invoke directly too: the handler must guard callbacks independently of native disabling.
    remove.props.onClick({ stopPropagation() {} });
    assert.deepEqual(calls, disabled ? [] : [['change', null, null], ['removed']]);
    for (const control of controls) assert.equal(control.props.disabled, disabled);
  });
}

function findInput(node) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'input') return node;
  return (node.children || []).flat(Infinity).map(findInput).find(Boolean);
}

for (const outcome of ['success', 'error']) {
  test(`pending file ${outcome} is discarded after disabling and re-enabling`, async () => {
    const refs = [];
    const errors = [];
    let cursor = 0;
    let previousDeps;
    let cleanup;
    let reader;
    const calls = [];
    const originalReader = globalThis.FileReader;
    globalThis.FileReader = class {
      constructor() { reader = this; }
      readAsDataURL() {}
    };
    globalThis.__uploadHooks = {
      setState(value) { if (typeof value === 'string') errors.push(value); },
      useRef(value) {
        const index = cursor++;
        return refs[index] ||= { current: value };
      },
      useEffect(effect, deps) {
        if (!previousDeps || deps.some((value, index) => value !== previousDeps[index])) {
          cleanup?.();
          cleanup = effect();
          previousDeps = deps;
        }
      },
    };
    const render = disabled => {
      cursor = 0;
      return FileUpload({
        disabled,
        onChange: (...args) => calls.push(['change', ...args]),
        onFileSelected: (...args) => calls.push(['selected', ...args]),
      });
    };
    try {
      const input = findInput(render(false));
      input.props.onChange({ target: { files: [{ name: 'synthetic.txt', size: 12, type: 'text/plain' }] } });
      assert.ok(reader, 'processing must have started');
      render(true);
      render(false);
      if (outcome === 'success') reader.onload({ target: { result: 'data:text/plain;base64,dGVzdA==' } });
      else reader.onerror(new Error('synthetic read failure'));
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(calls, [], 'stale processing must not notify the form');
      assert.deepEqual(errors, [], 'stale failures must not change the form error');
      // A fresh selection after re-enabling must still work.
      findInput(render(false)).props.onChange({ target: { files: [{ name: 'fresh.txt', size: 12, type: 'text/plain' }] } });
      reader.onload({ target: { result: 'data:text/plain;base64,bmV3' } });
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(calls.length, 2);
      assert.equal(calls[1][1].name, 'fresh.txt');
    } finally {
      cleanup?.();
      delete globalThis.__uploadHooks;
      if (originalReader === undefined) delete globalThis.FileReader;
      else globalThis.FileReader = originalReader;
    }
  });
}
