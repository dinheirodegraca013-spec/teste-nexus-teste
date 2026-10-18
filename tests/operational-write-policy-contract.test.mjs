import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('docs/proposed-migrations/ADD_OPERATIONAL_ADMIN_WRITE_POLICIES.sql', 'utf8');
const tables = [
  'coordinators', 'leaders', 'crm_contacts', 'goals', 'campaign_events',
  'meetings', 'field_presences', 'materials_inventory',
  'material_distributions', 'car_stickers', 'house_stickers', 'popular_demands',
];

test('migration proposta protege toda escrita operacional por tenant e admin', () => {
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.match(sql, /nexus_auth_org_id\(\)/g);
  assert.match(sql, /nexus_is_admin\(\)/g);
  assert.match(sql, /FOR INSERT TO authenticated/);
  assert.match(sql, /FOR UPDATE TO authenticated/);
  assert.match(sql, /FOR DELETE TO authenticated/);
  assert.match(sql, /WITH CHECK/);
  assert.match(sql, /USING/);
  for (const table of tables) assert.match(sql, new RegExp(`'${table}'`));
});
