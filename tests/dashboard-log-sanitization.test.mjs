import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard registra apenas resumo seguro dos erros de consulta', async () => {
  const source = await readFile(new URL('../src/pages/app/DashboardPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /function summarizeDashboardError\(error: unknown\)/);
  assert.doesNotMatch(source, /details:\s*(?:err|error)\?\.details/);
  assert.doesNotMatch(source, /hint:\s*(?:err|error)\?\.hint/);
});
