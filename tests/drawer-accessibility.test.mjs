import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/ui/Drawer.tsx', import.meta.url), 'utf8');

test('Drawer exposes an accessible dialog and named close control', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal=\{true\}/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /id=\{titleId\}/);
  assert.match(source, /aria-label="Fechar painel"/);
});

test('Drawer traps keyboard focus and restores the trigger focus', () => {
  assert.match(source, /const dialogRef = useRef/);
  assert.match(source, /focusableSelector/);
  assert.match(source, /e\.key !== 'Tab'/);
  assert.match(source, /!dialog\.contains\(document\.activeElement\)/);
  assert.match(source, /restoreFocusRef\.current\?\.focus\(\)/);
});
