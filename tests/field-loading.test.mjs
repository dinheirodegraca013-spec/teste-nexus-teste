import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/FieldPage.tsx', 'utf8');

test('field loading clears tenant-scoped lists without an organization', () => {
  assert.match(source, /if \(!orgId\) \{[\s\S]*setLeaders\(\[\]\);[\s\S]*setRecentContacts\(\[\]\);[\s\S]*setCarStickers\(\[\]\);[\s\S]*setHouseStickers\(\[\]\);[\s\S]*setPresenceLogs\(\[\]\);[\s\S]*setIsLoading\(false\);[\s\S]*return;/);
});
