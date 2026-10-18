import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('função de convite desfaz usuário Auth quando o perfil falha', async () => {
  const source = await readFile(new URL('../supabase/functions/invite-organization-member/index.ts', import.meta.url), 'utf8');
  assert.match(source, /adminClient\.auth\.admin\.deleteUser\(invitation\.user\.id\)/);
  assert.match(source, /Invite rollback failed/);
});
