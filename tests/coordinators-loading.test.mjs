import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/CoordinatorsPage.tsx', 'utf8');

test('coordinators loading stops cleanly without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setCoordinators\(\[\]\);[\s\S]*setAllLeaders\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('coordinators page surfaces errors from both queries', () => {
  assert.match(source, /if \(coordsRes\.error\) throw coordsRes\.error;/);
  assert.match(source, /if \(leadersRes\.error\) throw leadersRes\.error;/);
});
