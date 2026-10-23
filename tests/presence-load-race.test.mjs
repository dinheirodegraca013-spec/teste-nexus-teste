import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/app/PresencePage.tsx', import.meta.url), 'utf8');

test('presence loading ignores stale organization responses', () => {
  assert.match(source, /useRef/);
  assert.match(source, /loadGenerationRef/);
  assert.match(source, /isCurrentLoad\(\)/);
  assert.match(source, /if \(!isCurrentLoad\(\)\) return;/);
});
