import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Storage organiza uploads por organização e vínculo hierárquico', async () => {
  const source = await readFile(new URL('../supabase/migrations/20261021230000_nexus_private_storage_hierarchical_access.sql', import.meta.url), 'utf8');
  assert.match(source, /FOR INSERT TO authenticated/);
  assert.match(source, /private\.nexus_auth_org_id\(\)/);
  assert.match(source, /<org>\/\<scope>\/\<user>/);
  assert.match(source, /nexus_evidence_can_access/);
  assert.match(source, /nexus_evidence_can_upload/);
  assert.match(source, /presences\|cars\|houses/);
});
