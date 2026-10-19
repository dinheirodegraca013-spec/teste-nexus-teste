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

test('toast close and sidebar logout controls have accessible names', async () => {
  const toast = await readFile(new URL('../src/contexts/ToastContext.tsx', import.meta.url), 'utf8');
  const sidebar = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  assert.match(toast, /aria-label="Fechar aviso"/);
  assert.match(sidebar, /aria-label="Sair do NEXUS"/);
});

test('native app text fields expose accessible names', async () => {
  const files = {
    'LeadersPage.tsx': 'Link exclusivo de cadastro',
    'IntelligencePage.tsx': 'Detalhamento da Reivindicação',
    'GoalsPage.tsx': 'Descrição e Diretrizes',
    'CrmPage.tsx': 'Observações e Demandas',
    'EventsPage.tsx': 'Orientações e Detalhes da Ação',
    'MeetingsPage.tsx': 'Ata e Deliberações',
    'CoordinatorsPage.tsx': 'Observações Estratégicas',
  };
  for (const [file, label] of Object.entries(files)) {
    const source = await readFile(new URL(`../src/pages/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, new RegExp(`aria-label="${label}"`));
  }
});
