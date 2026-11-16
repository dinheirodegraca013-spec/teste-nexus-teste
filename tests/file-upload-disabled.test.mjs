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
        export const useRef = value => ({ current: value });
        export const useState = value => [value, () => {}];
        export const useEffect = () => {};
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
