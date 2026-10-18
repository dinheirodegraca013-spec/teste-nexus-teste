import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cadastro não submete convite antes de resolver seus dados', async () => {
  const source = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /inviteDetailsReady/);
  assert.match(source, /setInviteDetailsReady\(true\)/);
  assert.match(source, /if \(!inviteDetailsReady\)/);
  assert.match(source, /password\.length < 8/);
  assert.match(source, /mínimo 8 caracteres/);
  assert.match(source, /pelo menos 8 caracteres/);
  assert.doesNotMatch(source, /pelo menos 6 caracteres/);
});
