import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the actual update services, replacing only the network boundary.
const artifact = await build({
  stdin: {
    contents: "export { coordinatorsService, leadersService, crmService, goalsService, eventsService, meetingsService, presenceService, materialsService, stickersService, intelligenceService } from './src/services/dataServices';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  plugins: [{
    name: 'mock-supabase-update',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({
        path: args.path, namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            from(table) {
              globalThis.__nexusUpdates.calls.push(['from',table]);
              return {
                update(patch) {
                  globalThis.__nexusUpdates.calls.push(['update',patch]);
                  return {
                    eq(column,id) {
                      globalThis.__nexusUpdates.calls.push(['eq',column,id]);
                      return {
                        select() {
                          globalThis.__nexusUpdates.calls.push('select');
                          return {
                            maybeSingle: async () => globalThis.__nexusUpdates.outcome
                          };
                        }
                      };
                    }
                  };
                }
              };
            },
          };
        `,
      }));
    },
  }],
});
const {
  coordinatorsService, leadersService, crmService, goalsService, eventsService,
  meetingsService, presenceService, materialsService, stickersService,
  intelligenceService,
} = await import(`data:text/javascript;base64,${Buffer.from(artifact.outputFiles[0].text).toString('base64')}`);

const id='10000000-0000-4000-8000-000000000001';
const operations=[
  ['coordenação','coordinators',(updates={name:'Exemplo'})=>coordinatorsService.update(id,updates)],
  ['liderança','leaders',(updates={name:'Exemplo'})=>leadersService.update(id,updates)],
  ['CRM','crm_contacts',(updates={name:'Exemplo'})=>crmService.update(id,updates)],
  ['meta','goals',(updates={name:'Exemplo'})=>goalsService.update(id,updates)],
  ['evento','campaign_events',(updates={name:'Exemplo'})=>eventsService.update(id,updates)],
  ['reunião','meetings',(updates={name:'Exemplo'})=>meetingsService.update(id,updates)],
  ['presença','field_presences',(updates={name:'Exemplo'})=>presenceService.update(id,updates)],
  ['materiais','materials_inventory',(updates={name:'Exemplo'})=>materialsService.updateItem(id,updates)],
  ['adesivagem de carro','car_stickers',(updates={owner_name:'Exemplo'})=>stickersService.updateCarSticker(id,updates)],
  ['adesivagem de casa','house_stickers',(updates={resident_name:'Exemplo'})=>stickersService.updateHouseSticker(id,updates)],
  ['demanda','popular_demands',(updates={name:'Exemplo'})=>intelligenceService.updateDemand(id,updates)],
];
function setup(outcome) {
  globalThis.__nexusUpdates={outcome,calls:[]};
  return globalThis.__nexusUpdates;
}
for(const [label,table,operation] of operations) {
  test(`${label}: RLS/ID inexistente com 0 alterações é um erro, não sucesso`,async()=>{
    const state=setup({data:null,error:null});
    const result=await operation();
    assert.equal(result.data,null);
    assert.equal(result.error?.code,'UPDATE_NOT_APPLIED');
    assert.equal(state.calls[0][0],'from');
    assert.equal(state.calls[0][1],table);
    assert.deepEqual(state.calls.find(x=>Array.isArray(x)&&x[0]==='eq'),['eq','id',id]);
    assert.equal(state.calls.at(-1),'select');
  });
  test(`${label}: atualização confirmada preserva sucesso`,async()=>{
    setup({data:{id,name:'Exemplo',tags:[]},error:null});
    const result=await operation();
    assert.equal(result.error,null);
    assert.equal(result.data?.id,id);
  });
  test(`${label}: erro real do Supabase é preservado`,async()=>{
    const e={code:'42501',message:'Sem permissão'};
    setup({data:null,error:e});
    const result=await operation();
    assert.equal(result.error,e);
  });
  test(`${label}: não permite troca client-side de organização`,async()=>{
    const state=setup({data:{id,name:'Exemplo'},error:null});
    await operation({name:'Exemplo',organization_id:'20000000-0000-4000-8000-000000000002'});
    const patch=state.calls.find(x=>Array.isArray(x)&&x[0]==='update')?.[1];
    assert.equal(Object.prototype.hasOwnProperty.call(patch,'organization_id'),false);
  });
}
