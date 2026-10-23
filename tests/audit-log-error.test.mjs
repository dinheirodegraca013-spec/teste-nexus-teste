import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const artifact = await build({
  stdin: { contents: "export { auditService } from './src/services/dataServices';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-audit-log',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { from() { return {
          insert: async () => globalThis.__nexusAuditLog.outcome
        }; } };
      ` }));
    },
  }],
});
const { auditService } = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

test('audit log reports a returned Supabase error instead of silently ignoring it', async () => {
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  globalThis.__nexusAuditLog = { outcome: { error: { message: 'audit unavailable' } } };
  try {
    await auditService.log({ organization_id: '10000000-0000-4000-8000-000000000001', action: 'read', entity: 'test' });
  } finally {
    console.warn = previousWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][0]), /Erro ao registrar log de auditoria/);
  assert.match(String(warnings[0][1]?.message), /audit unavailable/);
  assert.equal(warnings[0][1]?.details, undefined);
  assert.equal(warnings[0][1]?.hint, undefined);
});
