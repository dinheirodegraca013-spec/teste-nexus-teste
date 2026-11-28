import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Isolated component contract: synthetic DOM and keyboard events, no browser or network.
const artifact = await build({
  stdin: {
    contents: "export { Modal } from './src/components/ui/Modal'; export { effects, refs } from 'react';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'transform',
  plugins: [{
    name: 'mock-modal-runtime',
    setup(build) {
      build.onResolve({ filter: /^(react(?:\/jsx-runtime)?|motion\/react|lucide-react)$/ },
        args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({
        contents: args.path === 'react' ? `
          export const effects = [], refs = [];
          export const useEffect = fn => { effects.push(fn); };
          export const useRef = initial => { const ref = { current: initial }; refs.push(ref); return ref; };
          export const useId = () => 'synthetic-title-id';
          export default {};
        ` : args.path === 'react/jsx-runtime' ? `
          export const jsx = (type, props) => ({ type, props });
          export const jsxs = jsx;
        ` : args.path === 'motion/react' ? `
          export const motion = { div: 'motion.div' };
          export const AnimatePresence = 'AnimatePresence';
        ` : "export const X = 'X';",
      }));
    },
  }],
});
const { Modal, effects, refs } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`
);

function walk(node, predicate) {
  if (node == null || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) { const found = walk(child, predicate); if (found) return found; }
    return undefined;
  }
  if (predicate(node)) return node;
  return walk(node.props?.children, predicate);
}

test('open modal has accessible dialog semantics and named close button', () => {
  effects.length = refs.length = 0;
  const tree = Modal({ isOpen: true, onClose() {}, title: 'Editar cadastro', children: null });
  const dialog = walk(tree, n => n.props?.role === 'dialog');
  assert.ok(dialog, 'Dialog role must be exposed to assistive technologies');
  assert.equal(dialog.props['aria-modal'], true);
  assert.equal(dialog.props.tabIndex, -1);
  const heading = walk(tree, n => n.props?.id === dialog.props['aria-labelledby']);
  assert.ok(heading, 'The dialog must reference its visible heading');
  const close = walk(tree, n => n.type === 'button');
  assert.equal(close?.props?.['aria-label'], 'Fechar janela');
});
test('modal focuses on open, traps Tab, handles Escape and restores focus', () => {
  effects.length = refs.length = 0;
  let closeCount = 0;
  Modal({ isOpen: true, onClose() { closeCount++; }, title: 'Teste', children: null });
  const listeners = new Map();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const previous = { focus() { globalThis.document.activeElement = previous; } };
  const first = { focus() { globalThis.document.activeElement = first; } };
  const last = { focus() { globalThis.document.activeElement = last; } };
  const dialog = {
    focus() { globalThis.document.activeElement = dialog; },
    querySelectorAll() { return [first, last]; },
    contains(el) { return el === first || el === last || el === dialog; },
  };
  globalThis.document = {
    activeElement: previous,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  globalThis.window = {
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  try {
    assert.ok(refs.length > 0, 'The dialog must expose a focusable ref');
    refs[0].current = dialog;
    const cleanup = effects[0]();
    assert.equal(globalThis.document.activeElement, dialog);
    const keydown = listeners.get('keydown');
    assert.equal(typeof keydown, 'function');
    const key = (name, shiftKey = false) => {
      let prevented = false;
      keydown({ key: name, shiftKey, preventDefault() { prevented = true; } });
      return prevented;
    };
    globalThis.document.activeElement = { focus() {} };
    assert.equal(key('Tab'), true);
    assert.equal(globalThis.document.activeElement, first);
    assert.equal(key('Tab', true), true);
    assert.equal(globalThis.document.activeElement, last);
    assert.equal(key('Tab'), true);
    assert.equal(globalThis.document.activeElement, first);
    assert.equal(key('Escape'), true);
    assert.equal(closeCount, 1);
    cleanup();
    assert.equal(globalThis.document.activeElement, previous);
    assert.equal(listeners.has('keydown'), false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

