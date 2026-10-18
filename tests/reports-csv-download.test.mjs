import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCsvBlob, escapeCsvCell } from '../src/utils/csv.ts';

test('CSV export preserves contact names containing # and UTF-8 characters', async () => {
  const blob = buildCsvBlob(['Nome', 'Territorio'], [['Ana # Silva', 'São Vicente']]);
  assert.equal(blob.type, 'text/csv;charset=utf-8');
  assert.equal(await blob.text(), '"Nome","Territorio"\r\n"Ana # Silva","São Vicente"');
});

test('CSV export protects formulas even after leading whitespace', () => {
  assert.equal(escapeCsvCell('  =1+1'), '"\'  =1+1"');
  assert.equal(escapeCsvCell('\t@SUM(1)'), '"\'\t@SUM(1)"');
  assert.equal(escapeCsvCell('=1+1'), '"\'=1+1"');
  assert.equal(escapeCsvCell('Ana # Silva'), '"Ana # Silva"');
});

test('ReportsPage downloads CSV using a revocable Blob URL instead of data URLs', async () => {
  const source = await readFile(new URL('../src/pages/app/ReportsPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /buildCsvBlob\(headers, rows\)/);
  assert.match(source, /URL\.createObjectURL\(/);
  assert.match(source, /URL\.revokeObjectURL\(/);
  assert.doesNotMatch(source, /encodeURI\(/);
  assert.doesNotMatch(source, /data:text\/csv/);
});
