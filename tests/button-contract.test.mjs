import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shared Button defaults to a non-submitting button', async () => {
  const source = await readFile(new URL('../src/components/ui/Button.tsx', import.meta.url), 'utf8');
  assert.match(source, /<button\s+type="button"/);
  assert.match(source, /\.\.\.props/);
});

test('icon-only shared controls have accessible names', async () => {
  const header = await readFile(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8');
  const search = await readFile(new URL('../src/components/ui/SearchInput.tsx', import.meta.url), 'utf8');
  assert.match(header, /aria-label="Abrir menu de navegação"/);
  assert.match(search, /aria-label="Limpar busca"/);
});

test('image preview close controls have accessible names', async () => {
  for (const file of ['FieldPage.tsx', 'StickersPage.tsx', 'PresencePage.tsx']) {
    const source = await readFile(new URL(`../src/pages/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, /aria-label="Fechar visualização da imagem"/);
  }
});
