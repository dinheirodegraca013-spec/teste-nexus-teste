import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: "export { mayRevokeMember, isUuid } from './docs/proposed-edge-functions/revoke-member/access.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { mayRevokeMember, isUuid } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);
const userId='10000000-0000-4000-8000-000000000001';
const targetId='10000000-0000-4000-8000-000000000002';
const org='10000000-0000-4000-8000-000000000003';
const other='10000000-0000-4000-8000-000000000004';
const actor={id:userId,organization_id:org,role:'admin',is_blocked:false};
const target={id:targetId,organization_id:org,role:'leader',is_blocked:false};
const decide=(a=actor,t=target,verified=userId)=>mayRevokeMember(a,t,verified);

test('authorized admin may revoke a non-privileged user in own tenant',()=>{
  assert.deepEqual(decide(),{allowed:true});
});
test('superadmin still cannot cross tenant boundary',()=>{
  assert.equal(decide({...actor,role:'superadmin'}, {...target,organization_id:other}).code,'CROSS_TENANT_DENIED');
});
test('coordinator and controller cannot revoke a user',()=>{
  for(const role of ['coordinator','controller','operator','manager','viewer','leader']){
    assert.equal(decide({...actor,role}).code,'ADMIN_ONLY');
  }
});
test('blocked administrator is denied',()=>{
  assert.equal(decide({...actor,is_blocked:true}).code,'ADMIN_ONLY');
});
test('cannot revoke a different authenticated actor identity',()=>{
  assert.equal(decide(actor,target,targetId).code,'ADMIN_ONLY');
});
test('self-revocation is rejected',()=>{
  assert.equal(decide(actor,{...actor}).code,'PRIVILEGED_TARGET_DENIED');
});
test('cannot revoke another admin or superadmin',()=>{
  for(const role of ['admin','superadmin']){
    assert.equal(decide(actor,{...target,role}).code,'PRIVILEGED_TARGET_DENIED');
  }
});
test('missing/invalid profile and ID fail closed',()=>{
  assert.equal(decide(null).code,'MEMBER_NOT_FOUND');
  assert.equal(decide(actor,null).code,'MEMBER_NOT_FOUND');
  assert.equal(decide({...actor,id:'bad'}).code,'MEMBER_NOT_FOUND');
  assert.equal(isUuid('not-a-uuid'),false);
});
test('only known subordinate roles are supported',()=>{
  for(const role of ['leader','coordinator','controller','manager','operator','viewer']){
    assert.equal(decide(actor,{...target,role}).allowed,true);
  }
  assert.equal(decide(actor,{...target,role:'unknown'}).code,'UNSUPPORTED_ROLE');
});
