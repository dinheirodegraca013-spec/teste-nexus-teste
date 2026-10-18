import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../scripts/e2e/tenant-auth-readonly.mjs', import.meta.url), 'utf8');

test('tenant E2E inclui verificação read-only do Storage privado', () => {
  assert.match(script, /\.storage[\s\S]*\.from\(['"]nexus-evidence-private['"]\)/);
  assert.match(script, /\.list\(own\.organization_id/);
  assert.match(script, /\.list\(foreign\.organization_id/);
  assert.match(script, /cross-tenant Storage/);
});
