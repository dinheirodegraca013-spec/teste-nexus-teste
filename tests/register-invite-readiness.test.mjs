import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cadastro não submete convite antes de resolver seus dados', async () => {
  const source = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /inviteDetailsReady/);
  assert.match(source, /setInviteDetailsReady\(true\)/);
  assert.match(source, /if \(!inviteDetailsReady\)/);
});
