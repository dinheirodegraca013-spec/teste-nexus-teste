import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/GoalsPage.tsx', 'utf8');

test('goals loading stops cleanly without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setGoals\(\[\]\);[\s\S]*setCoordinators\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('goals page surfaces errors from either query before using data', () => {
  assert.match(source, /if \(goalsRes\.error\) throw goalsRes\.error;/);
  assert.match(source, /if \(coordsRes\.error\) throw coordsRes\.error;/);
});
