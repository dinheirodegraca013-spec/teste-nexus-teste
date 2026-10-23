import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/contexts/AuthContext.tsx', 'utf8');
const functionSource = source.match(/function summarizeAuthError\(error: unknown\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(functionSource, 'summarizeAuthError must remain available for the privacy contract');
const executableFunction = functionSource
  .replace('function summarizeAuthError(error: unknown)', 'function summarizeAuthError(error)')
  .replace('error as Record<string, unknown>', 'error')
  .replace('(value: unknown)', '(value)');
const summarizeAuthError = new Function(`${executableFunction}; return summarizeAuthError;`)();

test('auth logs redact provider error messages', () => {
  assert.match(source, /message:\s*['"]redacted['"]/);
  assert.doesNotMatch(source, /message:\s*err\?\.message\s*\|\|\s*String\(err\)/);
  assert.doesNotMatch(source, /message:\s*typeof candidate\.message === 'string' \? candidate\.message/);
});

test('auth error summary redacts synthetic emails, tokens and credentials', () => {
  const summary = summarizeAuthError({
    name: 'AuthApiError',
    code: 'invalid_credentials',
    status: 401,
    message: 'login failed for synthetic@example.invalid token=secret-token password=secret-password',
  });
  assert.deepEqual(summary, {
    errorName: 'AuthApiError',
    message: 'redacted',
    code: 'invalid_credentials',
    status: 401,
  });
  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /synthetic@example\.invalid|secret-token|secret-password/);
});
