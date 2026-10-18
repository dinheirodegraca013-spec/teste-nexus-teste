import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export { coordinatorsService, leadersService, crmService, goalsService, eventsService, meetingsService, presenceService, materialsService, stickersService, intelligenceService } from './src/services/dataServices';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-supabase-create',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const supabase = { from(table) {
          globalThis.__creationProbe.calls.push(['from', table]);
          return { insert(payload) { globalThis.__creationProbe.calls.push(['insert', payload]); return {
            select() { globalThis.__creationProbe.calls.push('select'); return {
              maybeSingle: async () => globalThis.__creationProbe.outcome
            }; }
          }; } };
        }};
      ` }));
    },
  }],
});
const services = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const orgId = '10000000-0000-4000-8000-000000000001';
const operations = [
  ['coordenação', 'coordinators', () => services.coordinatorsService.create({ organization_id: orgId, name: 'Exemplo' })],
  ['liderança', 'leaders', () => services.leadersService.create({ organization_id: orgId, name: 'Exemplo' })],
  ['CRM', 'crm_contacts', () => services.crmService.create({ organization_id: orgId, name: 'Exemplo' })],
  ['meta', 'goals', () => services.goalsService.create({ organization_id: orgId, name: 'Exemplo' })],
  ['evento', 'campaign_events', () => services.eventsService.create({ organization_id: orgId, title: 'Exemplo' })],
  ['reunião', 'meetings', () => services.meetingsService.create({ organization_id: orgId, title: 'Exemplo' })],
  ['presença', 'field_presences', () => services.presenceService.create({ organization_id: orgId })],
  ['material', 'materials_inventory', () => services.materialsService.createItem({ organization_id: orgId, name: 'Exemplo' })],
  ['distribuição', 'material_distributions', () => services.materialsService.createDistribution({ organization_id: orgId })],
  ['adesivagem de carro', 'car_stickers', () => services.stickersService.createCarSticker({ organization_id: orgId })],
  ['adesivagem de casa', 'house_stickers', () => services.stickersService.createHouseSticker({ organization_id: orgId })],
  ['demanda', 'popular_demands', () => services.intelligenceService.createDemand({ organization_id: orgId, title: 'Exemplo' })],
];

function setup(outcome) {
  globalThis.__creationProbe = { outcome, calls: [] };
  return globalThis.__creationProbe;
}

for (const [label, table, operation] of operations) {
  test(`${label}: criação sem linha retornada não informa sucesso`, async () => {
    const probe = setup({ data: null, error: null });
    const result = await operation();
    assert.equal(result.data, null);
    assert.equal(result.error?.code, 'CREATE_NOT_CONFIRMED');
    assert.deepEqual(probe.calls[0], ['from', table]);
  });

  test(`${label}: criação confirmada preserva sucesso`, async () => {
    setup({ data: { id: orgId, tags: [] }, error: null });
    const result = await operation();
    assert.equal(result.error, null);
    assert.equal(result.data?.id, orgId);
  });
}
