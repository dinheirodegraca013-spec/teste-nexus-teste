import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/FieldPage.tsx', 'utf8');

test('field CRM submission requires an explicitly resolved leader, not a null leader_id', () => {
  const start = source.indexOf('const handleSaveContact =');
  const end = source.indexOf('const handleSaveCar =', start);
  assert.ok(start >= 0 && end > start);
  const submit = source.slice(start, end);
  assert.match(submit, /const assignedLeader = leaders\.find/);
  assert.match(submit, /if \(!assignedLeader\)\s*\{[\s\S]*?return;\s*\}/);
  assert.match(submit, /leader_id:\s*assignedLeader\.id,/);
  assert.doesNotMatch(submit, /leader_id:\s*assignedLeader\?\.id/);
});

test('loading an empty leader list resets stale leader selection', () => {
  const start = source.indexOf('const loadData =');
  const end = source.indexOf('useEffect(', start);
  assert.ok(start >= 0 && end > start);
  const loader = source.slice(start, end);
  assert.match(loader, /setContactLeader\(''\)/);
  assert.doesNotMatch(loader, /if \(loadedLeaders\.length > 0\)\s*\{[\s\S]*?setContactLeader\(''\);\s*\}/);
});
