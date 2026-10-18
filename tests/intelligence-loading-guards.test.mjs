import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source-contract regression checks; not a substitute for authenticated E2E.
const source = readFileSync('src/pages/app/IntelligencePage.tsx', 'utf8');

test('intelligence checks all three Supabase error results before rendering data', () => {
  assert.match(source, /demandsRes\.error\s*\|\|\s*contactsRes\.error\s*\|\|\s*leadersRes\.error/);
  assert.match(source, /if \(failure\) throw new Error/);
});

test('intelligence renders a retryable error instead of silently showing empty data', () => {
  assert.match(source, /setLoadError\(message\)/);
  assert.match(source, /<ErrorState message=\{loadError\} onRetry=\{loadData\}/);
});

test('missing organization finishes loading without issuing a query', () => {
  assert.match(source, /if \(!orgId\) \{\s*setLoadError\('Nenhuma organização selecionada\.'\);\s*setIsLoading\(false\);\s*return;/);
});

test('stale tenant requests cannot publish results and old data is cleared', () => {
  assert.match(source, /requestId !== loadRequestId\.current/);
  assert.match(source, /setDemands\(\[\]\);\s*setContacts\(\[\]\);\s*setLeaders\(\[\]\);/);
  assert.match(source, /return \(\) => \{ loadRequestId\.current \+= 1; \}/);
});
