import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('convite de liderança exige e-mail para permitir provisionamento seguro', async () => {
  const source = await readFile(new URL('../src/pages/app/LeadersPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /params\.set\('email', lead\.email\.trim\(\)\)/);
  assert.match(source, /if \(!lead\.email\?\.trim\(\)\)/);
  assert.match(source, /Cadastre o e-mail da liderança antes de gerar o convite/);
});
