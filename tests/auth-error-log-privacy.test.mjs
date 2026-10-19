import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/contexts/AuthContext.tsx', 'utf8');

test('auth logs redact provider error messages', () => {
  assert.match(source, /message:\s*['"]redacted['"]/);
  assert.doesNotMatch(source, /message:\s*err\?\.message\s*\|\|\s*String\(err\)/);
  assert.doesNotMatch(source, /message:\s*typeof candidate\.message === 'string' \? candidate\.message/);
});
