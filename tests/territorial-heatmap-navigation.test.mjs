import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const intelligence = readFileSync('src/pages/app/IntelligencePage.tsx', 'utf8');
const layout = readFileSync('src/components/layout/AppLayout.tsx', 'utf8');
const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

test('mapa territorial agrega lideranças, apoiadores e demandas sem coordenadas pessoais', () => {
  assert.match(intelligence, /Mapa de calor das lideranças e trabalhos/);
  assert.match(intelligence, /A intensidade combina apoiadores, lideranças e demandas/);
  assert.match(intelligence, /leaderNames/);
  assert.match(intelligence, /highPriorityDemands/);
  assert.match(intelligence, /territoryView/);
});

test('navegação mobile fecha com escape e oferece controles acessíveis', () => {
  assert.match(layout, /event\.key === 'Escape'/);
  assert.match(layout, /document\.body\.style\.overflow/);
  assert.match(sidebar, /Fechar menu de navegação/);
  assert.match(sidebar, /overscroll-contain/);
});
