import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/components/ui/Modal.tsx', 'utf8');

test('modal exposes an accessible dialog name and description', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-describedby=\{description \? descriptionId : undefined\}/);
  assert.match(source, /id=\{titleId\}/);
});

test('modal traps keyboard focus and restores the trigger focus', () => {
  assert.match(source, /e\.key !== 'Tab'/);
  assert.match(source, /e\.shiftKey/);
  assert.match(source, /restoreFocusRef\.current\?\.focus\(\)/);
  assert.match(source, /aria-label="Fechar janela"/);
});
