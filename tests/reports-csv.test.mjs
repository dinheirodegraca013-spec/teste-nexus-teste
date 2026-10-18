import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { buildCsv, escapeCsvCell } from './src/utils/csv';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { buildCsv, escapeCsvCell } = await import(
  `data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`,
);

test('CSV escapes delimiters, quotes and line breaks', () => {
  assert.equal(escapeCsvCell('A, "B"\nC'), '"A, ""B""\nC"');
});

test('CSV neutralizes spreadsheet formula prefixes', () => {
  assert.equal(escapeCsvCell('=HYPERLINK("https://example.invalid")'), '"\'=HYPERLINK(""https://example.invalid"")"');
  assert.equal(buildCsv(['Nome'], [['@cmd']]), '"Nome"\r\n"\'@cmd"');
});
