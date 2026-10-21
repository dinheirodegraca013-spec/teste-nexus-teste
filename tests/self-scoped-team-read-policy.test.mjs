import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = '../supabase/migrations/20261021190000_nexus_self_scoped_team_read_policies.sql';

test('liderança pode ler a própria ficha com grant operacional, sem abrir outras lideranças', async () => {
  const source = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.match(source, /leaders_read/);
  assert.match(source, /m\.leader_id\s*=\s*leaders\.id/);
  assert.match(source, /module_key\s+IN\s*\('field',\s*'crm',\s*'presence',\s*'stickers'\)/);
  assert.match(source, /nexus_can_read_leader\(organization_id,\s*id\)/);
});

test('coordenador pode ler o próprio vínculo com grant operacional, sem abrir outros coordenadores', async () => {
  const source = await readFile(new URL(migrationPath, import.meta.url), 'utf8');
  assert.match(source, /coordinators_read/);
  assert.match(source, /m\.coordinator_id\s*=\s*coordinators\.id/);
  assert.match(source, /module_key\s+IN\s*\('field',\s*'crm',\s*'presence',\s*'stickers'\)/);
  assert.match(source, /nexus_can_read_coordinator\(organization_id,\s*id\)/);
});
