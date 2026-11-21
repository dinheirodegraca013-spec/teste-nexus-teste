import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Sidebar brand and profile controls are keyboard accessible', async () => {
  const source = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-label="Ir para o dashboard do NEXUS"/);
  assert.match(source, /aria-label="Abrir meu perfil"/);
  assert.match(source, /focus-visible:ring-2/);
});
