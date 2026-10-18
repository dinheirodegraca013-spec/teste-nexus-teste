import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const artifact = await build({
  stdin: { contents: "export { organizationsService } from './src/services/coreServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'mock-supabase', setup(build) {
    build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
      export const supabase = { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => globalThis.__orgUpdateOutcome }) }) }) }) };
    ` }));
  }}],
});
const { organizationsService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

test('organization update treats a zero-row RLS response as a failure', async () => {
  globalThis.__orgUpdateOutcome = { data: null, error: null };
  const { data, error } = await organizationsService.update('organization-id', { name: 'NEXUS' });
  assert.equal(data, null);
  assert.equal(error.code, 'ORGANIZATION_UPDATE_NOT_APPLIED');
});

test('onboarding only claims completion after both persisted operations succeed', () => {
  const source = readFileSync('src/pages/app/OnboardingPage.tsx', 'utf8');
  assert.match(source, /const \{ error: organizationError \} = await organizationsService\.update/);
  assert.match(source, /if \(organizationError\) throw organizationError/);
  assert.match(source, /const \{ error: coordinatorError \} = await coordinatorsService\.create/);
  assert.match(source, /if \(coordinatorError\) throw coordinatorError/);
  assert.match(source, /if \(!organization\?\.id\) throw new Error\('Organização não identificada\.'\)/);
});

test('plan selection never changes a subscription directly from the browser', () => {
  const source = readFileSync('src/pages/app/PlansPage.tsx', 'utf8');
  assert.doesNotMatch(source, /organizationsService\.update\s*\(/);
  assert.doesNotMatch(source, /Mudar para/);
});
