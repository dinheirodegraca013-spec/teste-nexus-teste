import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The service under test is real; only the network/database boundary is mocked.
const bundle = await build({
  stdin: {
    contents: "export { presenceService, stickersService, coordinatorsService, leadersService, crmService, goalsService, eventsService, meetingsService, materialsService, intelligenceService } from './src/services/dataServices';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'supabase-deletion-boundary',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({
        path: args.path, namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          function chain() {
            return {
              delete() { globalThis.__deletionProbe.calls.push('delete'); return this; },
              eq(field, value) {
                globalThis.__deletionProbe.calls.push(['eq', field, value]);
                return this;
              },
              select(fields) {
                globalThis.__deletionProbe.calls.push(['select', fields]);
                return this;
              },
              async maybeSingle() {
                globalThis.__deletionProbe.calls.push('maybeSingle');
                return globalThis.__deletionProbe.outcome;
              },
              then(resolve, reject) {
                return Promise.resolve(globalThis.__deletionProbe.outcome).then(resolve, reject);
              },
            };
          }
          export const supabase = {
            from(table) {
              globalThis.__deletionProbe.calls.push(['from', table]);
              return chain();
            }
          };
        `,
      }));
    },
  }],
});
const { presenceService, stickersService, coordinatorsService, leadersService, crmService, goalsService, eventsService, meetingsService, materialsService, intelligenceService } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

const id = '10000000-0000-4000-8000-000000000001';
const operations = [
  ['presença', 'field_presences', () => presenceService.deleteLog(id)],
  ['adesivagem de carro', 'car_stickers', () => stickersService.deleteCarSticker(id)],
  ['adesivagem de casa', 'house_stickers', () => stickersService.deleteHouseSticker(id)],
  ['coordenação', 'coordinators', () => coordinatorsService.delete(id)],
  ['liderança', 'leaders', () => leadersService.delete(id)],
  ['contato CRM', 'crm_contacts', () => crmService.delete(id)],
  ['meta', 'goals', () => goalsService.delete(id)],
  ['evento', 'campaign_events', () => eventsService.delete(id)],
  ['reunião', 'meetings', () => meetingsService.delete(id)],
  ['item de materiais', 'materials_inventory', () => materialsService.deleteItem(id)],
  ['demanda popular', 'popular_demands', () => intelligenceService.deleteDemand(id)],
];

function setup(outcome) {
  globalThis.__deletionProbe = { outcome, calls: [] };
  return globalThis.__deletionProbe;
}

for (const [label, table, operation] of operations) {
  test(`${label}: DELETE sem linha afetada não informa sucesso`, async () => {
    const probe = setup({ data: null, error: null });
    const result = await operation();
    assert.equal(result.error?.code, 'DELETE_NOT_APPLIED');
    assert.deepEqual(probe.calls, [
      ['from', table], 'delete', ['eq', 'id', id], ['select', 'id'], 'maybeSingle',
    ]);
  });

  test(`${label}: DELETE confirmado retorna sem erro`, async () => {
    setup({ data: { id }, error: null });
    const result = await operation();
    assert.equal(result.error, null);
  });

  test(`${label}: erro real do Supabase é preservado`, async () => {
    const dbError = { code: '42501', message: 'Acesso negado' };
    setup({ data: null, error: dbError });
    const result = await operation();
    assert.equal(result.error, dbError);
  });
}
