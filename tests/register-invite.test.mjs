import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/public/RegisterPage.tsx', 'utf8');

test('register uses URLSearchParams values without decoding twice', () => {
  assert.doesNotMatch(source, /decodeURIComponent\(param(?:Nome|Email|Territorio)\)/);
  assert.match(source, /if \(paramNome\) setName\(paramNome\)/);
  assert.match(source, /if \(paramEmail\) setEmail\(paramEmail\)/);
  assert.match(source, /if \(paramTerritorio\) setInviteTerritory\(paramTerritorio\)/);
});

test('URLSearchParams preserves a literal percent after its single decode', () => {
  const params = new URLSearchParams('?nome=100%25%20valido');
  assert.equal(params.get('nome'), '100% valido');
});
