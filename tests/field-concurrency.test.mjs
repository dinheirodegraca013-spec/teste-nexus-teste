import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard: a stale in-memory counter update used to overwrite goals
// when two users created CRM contacts concurrently. Only a server-side atomic
// operation or count derived from saved rows may mutate/recompute totals.
const source = readFileSync('src/pages/app/FieldPage.tsx', 'utf8');

test('fast CRM registration does not overwrite goal_reached with stale UI state', () => {
  const begin = source.indexOf('const handleSaveContact =');
  const end = source.indexOf('const handleSaveCar =', begin);
  assert.ok(begin >= 0 && end > begin);
  const submit = source.slice(begin, end);
  assert.ok(submit.includes('crmService.create('));
  assert.doesNotMatch(submit, /leadersService\.update\s*\(/);
  assert.doesNotMatch(submit, /goal_reached\s*:/);
});

test('field load reports Supabase query failures rather than rendering missing records as empty', () => {
  const start = source.indexOf('const loadData =');
  const end = source.indexOf('useEffect(', start);
  assert.ok(start >= 0 && end > start);
  const load = source.slice(start, end);
  assert.match(load, /\.find\(\(result\) => result\.error\)/);
  assert.match(load, /if \(failed\?\.error\) throw failed\.error/);
});
