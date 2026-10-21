import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('identidade operacional não expõe nome administrativo a liderança ou coordenação', async () => {
  const utility = await readFile(new URL('../src/utils/operationalIdentity.ts', import.meta.url), 'utf8');
  const sidebar = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const profile = await readFile(new URL('../src/pages/app/ProfilePage.tsx', import.meta.url), 'utf8');
  assert.match(utility, /leader.*coordinator|coordinator.*leader/);
  assert.match(utility, /Registro/);
  assert.match(sidebar, /getOperationalIdentity/);
  assert.match(profile, /getOperationalIdentity/);
  assert.match(profile, /Somente o e-mail e o registro do sistema/);
});
