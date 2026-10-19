import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shared Button defaults to a non-submitting button', async () => {
  const source = await readFile(new URL('../src/components/ui/Button.tsx', import.meta.url), 'utf8');
  assert.match(source, /<button\s+type="button"/);
  assert.match(source, /\.\.\.props/);
});
