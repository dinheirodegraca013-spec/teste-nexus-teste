import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/services/coreServices.ts', 'utf8');

test('profile creation rejects an empty successful insert response', () => {
  assert.match(source, /PROFILE_CREATE_NOT_CONFIRMED/);
  assert.match(source, /if \(!data\)/);
  assert.match(source, /return \{ data: null, error: confirmationError/);
});
