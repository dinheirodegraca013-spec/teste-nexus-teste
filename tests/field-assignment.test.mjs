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
  assert.match(loader, /profile\?\.role === 'leader' && loadedLeaders\.length === 1/);
  assert.match(loader, /loadedLeaders\.some\(\(leader\) => leader\.id === previous\) \? previous : ''/);
  assert.doesNotMatch(loader, /if \(loadedLeaders\.length > 0\)\s*\{[\s\S]*?setContactLeader\(''\);\s*\}/);
});

test('missing leader is validated before submit loading state starts', () => {
  const start = source.indexOf('const handleSaveContact =');
  const end = source.indexOf('const handleSaveCar =', start);
  assert.ok(start >= 0 && end > start);
  const submit = source.slice(start, end);
  const guard = submit.indexOf('if (!assignedLeader)');
  const loading = submit.indexOf('setIsSubmittingContact(true)');
  assert.ok(guard >= 0 && loading > guard, 'Loading must start only after the missing-leader guard');
});

test('administrators can choose a visible, scoped leader before saving a contact', () => {
  const start = source.indexOf('<form onSubmit={handleSaveContact}');
  const end = source.indexOf('</form>', start);
  assert.ok(start >= 0 && end > start);
  const form = source.slice(start, end);
  assert.match(form, /label="Liderança responsável"/);
  assert.match(form, /value=\{contactLeader\}/);
  assert.match(form, /onChange=\{\(e\) => setContactLeader\(e\.target\.value\)\}/);
  assert.match(form, /leaders\.map\(\(leader\)/);
});

test('a nonleader selection stays only when the refreshed scoped list still contains it', () => {
  const start = source.indexOf('const loadData =');
  const end = source.indexOf('useEffect(', start);
  assert.ok(start >= 0 && end > start);
  const loader = source.slice(start, end);
  assert.match(loader, /setContactLeader\(\(previous\) =>/);
  assert.match(loader, /loadedLeaders\.some\(\(leader\) => leader\.id === previous\)/);
});
