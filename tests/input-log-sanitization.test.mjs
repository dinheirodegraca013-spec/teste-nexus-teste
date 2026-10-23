import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('validações de entrada não registram valores fornecidos pelo usuário', async () => {
  const services = await readFile(new URL('../src/services/coreServices.ts', import.meta.url), 'utf8');
  const register = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(services, /console\.error\([^\n]+uuidErr\);/);
  assert.doesNotMatch(services, /console\.error\([^\n]+validationError\);/);
  assert.doesNotMatch(register, /console\.error\([^\n]+,\s*e\)/);
});
