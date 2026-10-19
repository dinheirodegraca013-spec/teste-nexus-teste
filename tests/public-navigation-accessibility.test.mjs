import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const file of ['ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx']) {
  test(`${file} exposes a keyboard-accessible home control`, async () => {
    const source = await readFile(new URL(`../src/pages/public/${file}`, import.meta.url), 'utf8');
    assert.match(source, /<button\s+type="button"[\s\S]*aria-label="Voltar para o início"/);
    assert.match(source, /focus-visible:ring-2/);
  });
}
