import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/app/MaterialsPage.tsx', 'utf8');

test('distribution does not report success when inventory update fails', () => {
  assert.match(source, /const \{ error: inventoryErr \} = await materialsService\.updateItem/);
  assert.match(source, /if \(inventoryErr\) \{[\s\S]*toastError\(['"]Erro ao atualizar estoque/);
  assert.match(source, /if \(inventoryErr\) \{[\s\S]*return;/);
});
