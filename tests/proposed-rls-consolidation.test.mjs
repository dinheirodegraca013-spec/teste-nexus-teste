import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('proposed RLS consolidation requires admin in WITH CHECK', () => {
  const source = fs.readFileSync('docs/proposed-migrations/CONSOLIDATE_DUPLICATE_RLS_POLICIES.sql', 'utf8');
  const withCheck = source.slice(source.indexOf('WITH CHECK'));
  assert.match(withCheck, /private\.nexus_is_admin\(\)/);
  assert.match(withCheck, /private\.nexus_is_superadmin\(\)/);
  assert.doesNotMatch(withCheck, /DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE/i);
});
