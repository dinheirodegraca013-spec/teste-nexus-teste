/**
 * REAL AUTHENTICATED integration smoke test, NOT unit/mocked.
 * Read-only. Never auto-run against production or arbitrary projects.
 *
 * Required in manual, DEV-only workflow:
 *   NEXUS_E2E_APPROVED=true
 *   NEXUS_E2E_SUPABASE_URL=https://qidstqsbxwkbkwowhpab.supabase.co
 *   NEXUS_E2E_ANON_KEY=<public anon/publishable key>
 *   NEXUS_E2E_A_EMAIL / NEXUS_E2E_A_PASSWORD
 *   NEXUS_E2E_B_EMAIL / NEXUS_E2E_B_PASSWORD
 * Accounts must be dedicated TEST users in different organizations.
 * Do not use real campaign identities. No data is created or deleted.
 */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_DEV_PROJECT='qidstqsbxwkbkwowhpab';
const values={
  approved:process.env.NEXUS_E2E_APPROVED,
  url:process.env.NEXUS_E2E_SUPABASE_URL,
  key:process.env.NEXUS_E2E_ANON_KEY,
  emailA:process.env.NEXUS_E2E_A_EMAIL,
  passwordA:process.env.NEXUS_E2E_A_PASSWORD,
  emailB:process.env.NEXUS_E2E_B_EMAIL,
  passwordB:process.env.NEXUS_E2E_B_PASSWORD,
};
if (values.approved!=='true') throw new Error('E2E bloqueado: execução DEV não autorizada explicitamente.');
const required=['url','key','emailA','passwordA','emailB','passwordB'];
for (const name of required) {
  if (!values[name]) throw new Error(`E2E não executado: variável ${name} ausente.`);
}
const url=new URL(values.url);
assert.equal(url.origin,`https://${EXPECTED_DEV_PROJECT}.supabase.co`,
  'Tentativa de executar E2E fora do projeto Supabase DEV autorizado');
if (!values.emailA.includes('@') || !values.emailB.includes('@') ||
    values.emailA.toLowerCase()===values.emailB.toLowerCase()) {
  throw new Error('O teste exige duas contas distintas, de teste e autenticadas.');
}

function client() {
  return createClient(values.url,values.key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}
const a=client();
const b=client();
async function authenticate(instance,email,password,label) {
  const {data,error}=await instance.auth.signInWithPassword({email,password});
  if(error || !data.user) throw new Error(`Autenticação de conta de teste ${label} falhou.`);
  const {data:profile, error:profileError}=await instance.from('profiles')
    .select('id,organization_id,role,is_blocked')
    .eq('id',data.user.id).maybeSingle();
  if(profileError || !profile || profile.is_blocked) {
    throw new Error(`Perfil de teste ${label} inválido ou bloqueado.`);
  }
  return profile;
}
try {
  const pa=await authenticate(a,values.emailA,values.passwordA,'A');
  const pb=await authenticate(b,values.emailB,values.passwordB,'B');
  assert.notEqual(pa.organization_id,pb.organization_id,'Test users must have different tenants');

  for(const [instance,own,foreign,label] of [
    [a,pa,pb,'A'],
    [b,pb,pa,'B'],
  ]) {
    const {data:mine,error:mineError}=await instance.from('organizations')
      .select('id').eq('id',own.organization_id);
    if(mineError) throw new Error(`Read own organization ${label} failed: ${mineError.message}`);
    assert.equal(mine?.length,1,`Account ${label} cannot read own test organization`);

    const {data:foreignOrgs,error:foreignError}=await instance.from('organizations')
      .select('id').eq('id',foreign.organization_id);
    if(foreignError) throw foreignError;
    assert.equal(foreignOrgs?.length,0,`SECURITY: account ${label} read another tenant's organization`);

    const {data:foreignProfiles,error:profileError}=await instance.from('profiles')
      .select('id').eq('id',foreign.id);
    if(profileError) throw profileError;
    assert.equal(foreignProfiles?.length,0,`SECURITY: account ${label} read foreign profile`);

    const {data:foreignCRM,error:crmError}=await instance.from('crm_contacts')
      .select('id,organization_id').eq('organization_id',foreign.organization_id).limit(5);
    if(crmError) throw crmError;
    assert.equal(foreignCRM?.length,0,`SECURITY: account ${label} read cross-tenant CRM`);
    console.log(`PASS: tenant separation for test account ${label}`);
  }
  console.log('PASS: two signed-in accounts isolated by RLS; READ-ONLY DEV smoke.');
} finally {
  await Promise.allSettled([a.auth.signOut(),b.auth.signOut()]);
}
