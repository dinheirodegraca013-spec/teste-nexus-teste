import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/MaterialsPage.tsx', 'utf8');

test('materials loading stops cleanly without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setMaterials\(\[\]\);[\s\S]*setDistributions\(\[\]\);[\s\S]*setCoordinators\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('materials page surfaces errors from inventory, distributions or coordinators', () => {
  assert.match(source, /if \(matsRes\.error\) throw matsRes\.error;/);
  assert.match(source, /if \(distRes\.error\) throw distRes\.error;/);
  assert.match(source, /if \(coordsRes\.error\) throw coordsRes\.error;/);
});
