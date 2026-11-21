import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cadastro não submete convite antes de resolver seus dados', async () => {
  const source = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /inviteDetailsReady/);
  assert.match(source, /setInviteDetailsReady\(true\)/);
  assert.match(source, /if \(!inviteDetailsReady\)/);
  assert.match(source, /password\.length < 8/);
  assert.match(source, /mínimo 8 caracteres/);
  assert.match(source, /pelo menos 8 caracteres/);
  assert.doesNotMatch(source, /pelo menos 6 caracteres/);
});

test('cadastro inicia com os termos desmarcados e exige aceite antes do envio', async () => {
  const source = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /\[acceptTerms, setAcceptTerms\] = useState\(false\)/);
  assert.match(source, /checked=\{acceptTerms\}\s+onChange=\{\(e\) => setAcceptTerms\(e\.target\.checked\)\}/);
  assert.match(source, /if \(!acceptTerms\) \{[^}]*return;\s*\}[\s\S]*await signUp\(/);
});

test('roteador e cadastro reconhecem os mesmos convites na query e no hash', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const register = await readFile(new URL('../src/pages/public/RegisterPage.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes("currentPath === '/cadastro' && Boolean(readRegistrationInvite(window.location).type)"));
  assert.ok(register.includes('readRegistrationInvite(window.location)'));

  const { readRegistrationInvite } = await import('../src/utils/registrationInvite.ts');
  for (const query of ['?convite=coordenador', '?convite=lider', '?lider_id=synthetic', '?coord=synthetic']) {
    const expected = query.includes('coordenador') ? 'coordenador' : 'lider';
    assert.equal(readRegistrationInvite({ search: query, hash: '' }).type, expected);
    assert.equal(readRegistrationInvite({ search: '', hash: '#/cadastro' + query }).type, expected);
    assert.equal(readRegistrationInvite({ search: '?utm_source=test', hash: '#/cadastro' + query }).type, expected);
  }
  assert.equal(readRegistrationInvite({ search: '?outro_convite=lider', hash: '' }).type, null);
});
