import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cadastro convidado não provisiona uma organização nova', async () => {
  const source = await readFile(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(organizationId && !isValidUUID\(organizationId\)\)/);
  assert.match(source, /if \(leaderId && !isValidUUID\(leaderId\)\)/);
  assert.match(source, /if \(coordinatorId && !isValidUUID\(coordinatorId\)\)/);
  assert.match(source, /if \(!sanitizedOrgId\) \{/);
  assert.match(source, /Convites já apontam para um tenant existente/);
  assert.match(source, /rpcErr \|\| !isValidUUID\(rpcOrgId\)/);
  assert.match(source, /organização não foi confirmada pelo banco/);
});
