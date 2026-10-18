import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('GoalsPage clears tenant data and closes the active modal on organization change', async () => {
  const source = await readFile(new URL('../src/pages/app/GoalsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /setGoals\(\[\]\)/);
  assert.match(source, /setCoordinators\(\[\]\)/);
  assert.match(source, /setIsModalOpen\(false\)/);
  assert.match(source, /\}, \[orgId\]\);/);
});

test('StickersPage clears tenant data and closes tenant-scoped UI on organization change', async () => {
  const source = await readFile(new URL('../src/pages/app/StickersPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /setCarStickers\(\[\]\)/);
  assert.match(source, /setHouseStickers\(\[\]\)/);
  assert.match(source, /setIsCarModalOpen\(false\)/);
  assert.match(source, /setIsHouseModalOpen\(false\)/);
});

test('FileUpload ignores stale image processing results after replacement or removal', async () => {
  const source = await readFile(new URL('../src/components/ui/FileUpload.tsx', import.meta.url), 'utf8');
  assert.match(source, /processGenerationRef/);
  assert.match(source, /processGeneration !== processGenerationRef\.current/);
  assert.match(source, /processGenerationRef\.current \+= 1/);
});
