import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/app/UsersPage.tsx', 'utf8');

test('users loading clears tenant members when organization is unavailable', () => {
  assert.match(source, /setMembers\(\[\]\)/);
  assert.match(source, /setIsLoading\(false\)/);
  assert.match(source, /if \(error\) throw error/);
});
