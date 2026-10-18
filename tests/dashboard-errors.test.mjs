import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/DashboardPage.tsx', 'utf8');

test('dashboard exposes a visible error when any source query fails', () => {
  assert.match(source, /const failedQuery = \[[\s\S]*presenceRes[\s\S]*\]\.find/);
  assert.match(source, /if \(failedQuery\) \{[\s\S]*setLoadError\(/);
});
