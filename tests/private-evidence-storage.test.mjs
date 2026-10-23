import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: "export { inspectEvidenceImage, isTenantEvidencePath, uploadPrivateEvidence, getPrivateEvidenceUrl } from './src/services/privateEvidenceStorage';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'mock-private-storage',
    setup(build) {
      build.onResolve({ filter: /^\.\.\/lib\/supabase$/ }, args => ({ path: args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: `
          export const supabase = {
            auth: {
              getUser: async () => {
                globalThis.__evidence.calls.push('getUser');
                return globalThis.__evidence.auth;
              }
            },
            from(table) {
              globalThis.__evidence.calls.push(['from',table]);
              return {
                select(columns) {
                  globalThis.__evidence.calls.push(['select',columns]);
                  return {
                    eq(column,value) {
                      globalThis.__evidence.calls.push(['eq',column,value]);
                      return { maybeSingle: async () => globalThis.__evidence.profile };
                    }
                  };
                }
              };
            },
            storage: {
              from(bucket) {
                globalThis.__evidence.calls.push(['bucket',bucket]);
                return {
                  upload: async (...args) => {
                    globalThis.__evidence.calls.push(['upload',args[0],args[2]]);
                    return globalThis.__evidence.uploadResult || { data: { path: args[0] }, error: null };
                  },
                  createSignedUrl: async (...args) => {
                    globalThis.__evidence.calls.push(['signedUrl',...args]);
                    return globalThis.__evidence.signedResult || {
                      data: { signedUrl: 'https://storage.example.invalid/signed' }, error: null,
                    };
                  }
                };
              },
            },
          };
        `,
      }));
    },
  }],
});
const { inspectEvidenceImage, isTenantEvidencePath, uploadPrivateEvidence, getPrivateEvidenceUrl } =
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

const org='10000000-0000-4000-8000-000000000001';
const other='10000000-0000-4000-8000-000000000002';
const uid='10000000-0000-4000-8000-000000000003';
const photo=new Blob([Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,0,0,0])], {type:'image/jpeg'});
function setup(overrides={}) {
  globalThis.__evidence={
    auth: { data: { user: { id:uid } }, error:null },
    profile: { data: { organization_id:org,role:'admin',is_blocked:false },error:null },
    calls:[],...overrides,
  };
  return globalThis.__evidence;
}

test('valid jpeg magic bytes are accepted',async()=>{
  const check=await inspectEvidenceImage(photo);
  assert.deepEqual(check, {mime:'image/jpeg',extension:'jpg'});
});
test('spoofed image MIME is rejected based on magic bytes',async()=>{
  const fake=new Blob([Uint8Array.from([65,66,67,68,69,70,71,72,73,74,75,76])],{type:'image/jpeg'});
  assert.equal((await inspectEvidenceImage(fake)).code,'EVIDENCE_TYPE_REJECTED');
});
test('mismatched declared MIME is rejected',async()=>{
  const img=new Blob([await photo.arrayBuffer()],{type:'image/png'});
  assert.equal((await inspectEvidenceImage(img)).code,'EVIDENCE_MIME_MISMATCH');
});
test('empty and oversized evidence rejected without database access',async()=>{
  assert.equal((await inspectEvidenceImage(new Blob([]))).code,'EVIDENCE_FILE_INVALID');
  const huge=new Blob([new Uint8Array(5*1024*1024+1)]);
  assert.equal((await inspectEvidenceImage(huge)).code,'EVIDENCE_FILE_INVALID');
});
test('correct tenant prefix and object key required',()=>{
  const valid=org+'/leader/'+uid+'/cars/10000000-0000-4000-8000-000000000004.webp';
  assert.equal(isTenantEvidencePath(valid,org),true);
  assert.equal(isTenantEvidencePath(valid,other),false);
  assert.equal(isTenantEvidencePath(org+'/leader/'+uid+'/cars/../other.jpg',org),false);
  assert.equal(isTenantEvidencePath('https://example.invalid/x.jpg',org),false);
  assert.equal(isTenantEvidencePath('data:image/png;base64,x',org),false);
});
test('upload is denied before Supabase when the wrong tenant is requested',async()=>{
  const state=setup({profile:{data:{organization_id:other,role:'admin',is_blocked:false},error:null}});
  const answer=await uploadPrivateEvidence(org,'cars',photo);
  assert.equal(answer.error.code,'TENANT_MEMBER_REQUIRED');
  assert.equal(state.calls.some(x=>Array.isArray(x)&&x[0]==='upload'),false);
});
test('upload allows active tenant members and denies blocked accounts',async()=>{
  for(const role of ['leader','coordinator','operator','viewer']) {
    const state=setup({profile:{data:{organization_id:org,role,is_blocked:false},error:null}});
    const answer=await uploadPrivateEvidence(org,'presences',photo);
    assert.equal(answer.error,null);
    assert.equal(state.calls.some(x=>Array.isArray(x)&&x[0]==='upload'),true);
  }
  {
    const state=setup({profile:{data:{organization_id:org,role:'admin',is_blocked:true},error:null}});
    const answer=await uploadPrivateEvidence(org,'presences',photo);
    assert.equal(answer.error.code,'TENANT_MEMBER_REQUIRED');
    assert.equal(state.calls.some(x=>Array.isArray(x)&&x[0]==='upload'),false);
  }
});
test('successful upload stores only a private tenant path',async()=>{
  const state=setup();
  const answer=await uploadPrivateEvidence(org,'houses',photo);
  assert.equal(answer.error,null);
  assert.equal(isTenantEvidencePath(answer.data.path,org),true);
  const upload=state.calls.find(x=>Array.isArray(x)&&x[0]==='upload');
  assert.ok(upload);
  assert.equal(upload[2].upsert,false);
  assert.equal(upload[2].contentType,'image/jpeg');
  assert.deepEqual(state.calls.find(x=>Array.isArray(x)&&x[0]==='bucket'),['bucket','nexus-evidence-private']);
});
test('zero-row/unconfirmed upload never reports success',async()=>{
  setup({uploadResult:{data:null,error:null}});
  const result=await uploadPrivateEvidence(org,'cars',photo);
  assert.equal(result.error.code,'EVIDENCE_UPLOAD_NOT_CONFIRMED');
});
test('cross-tenant signing rejected before any remote calls',async()=>{
  const state=setup();
  const bad=other+'/leader/'+uid+'/cars/10000000-0000-4000-8000-000000000004.jpg';
  const response=await getPrivateEvidenceUrl(org,bad);
  assert.equal(response.error.code,'INVALID_EVIDENCE_PATH');
  assert.deepEqual(state.calls,[]);
});
test('signed URLs are short-lived and never public',async()=>{
  const state=setup();
  const path=org+'/leader/'+uid+'/cars/10000000-0000-4000-8000-000000000004.jpg';
  const response=await getPrivateEvidenceUrl(org,path);
  assert.equal(response.error,null);
  assert.equal(response.data.url,'https://storage.example.invalid/signed');
  assert.deepEqual(state.calls.find(x=>Array.isArray(x)&&x[0]==='signedUrl'),['signedUrl',path,60]);
});
