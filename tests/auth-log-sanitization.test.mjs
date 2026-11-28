import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('logs de autenticação resumem erros sem registrar objetos brutos', async () => {
  const source = await readFile(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');
  assert.match(source, /function summarizeAuthError\(error: unknown\)/);
  assert.match(source, /summarizeAuthError\(profEx\)/);
  assert.match(source, /summarizeAuthError\(orgEx\)/);
  assert.match(source, /summarizeAuthError\(permsEx\)/);
  assert.doesNotMatch(source, /,\s*rpcEx\)/);
  assert.doesNotMatch(source, /,\s*rpcErr\);/);
});
