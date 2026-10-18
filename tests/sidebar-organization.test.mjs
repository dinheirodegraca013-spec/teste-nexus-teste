import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const authSource = readFileSync('src/contexts/AuthContext.tsx', 'utf8');

test('sidebar does not expose a client-side organization switcher', () => {
  assert.doesNotMatch(source, /switchOrganization\s*\(/);
  assert.doesNotMatch(source, /Alternar Organização/);
  assert.doesNotMatch(source, /organizations\.map\s*\(/);
});

test('auth context does not retain a browser tenant-switch API or tenant list query', () => {
  assert.doesNotMatch(authSource, /switchOrganization\s*:/);
  assert.doesNotMatch(authSource, /organizationsService\.getAll\s*\(/);
});
