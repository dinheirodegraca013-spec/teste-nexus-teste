import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/ReportsPage.tsx', 'utf8');

test('reports loading stops and clears data without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setContacts\(\[\]\);[\s\S]*setHouseStickers\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});

test('reports page surfaces errors from every source query', () => {
  for (const name of ['contactsRes', 'leadersRes', 'coordsRes', 'goalsRes', 'eventsRes', 'carsRes', 'housesRes']) {
    assert.match(source, new RegExp(`if \\(${name}\\.error\\) throw ${name}\\.error;`));
  }
});
