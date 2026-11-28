// REVIEW ONLY: proposal for Supabase DEV qidstqsbxwkbkwowhpab.
// Do not deploy until specific user approval; perform signed-in two-tenant
// validation first. SUPABASE_SERVICE_ROLE_KEY must remain ONLY server-side.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isUuid, mayRevokeMember, type MemberRecord } from './access.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
function response(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405,{error:'Método não permitido.'});
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return response(401,{error:'Autenticação obrigatória.'});
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !serviceKey) return response(503,{error:'Operação administrativa indisponível.'});

  let payload: { target_user_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return response(400,{error:'Requisição inválida.'});
  }
  if (!isUuid(payload?.target_user_id)) {
    return response(400,{error:'Identificador de membro inválido.'});
  }

  const authClient = createClient(url, anon, {
    auth: {persistSession:false,autoRefreshToken:false},
    global: {headers:{Authorization:authorization}},
  });
  const service = createClient(url,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const { data: verified, error: authError } = await authClient.auth.getUser();
  if (authError || !verified?.user?.id) {
    return response(401,{error:'Sessão inválida ou expirada.'});
  }
  const authUserId = verified.user.id;
  // Fetch both records independently. Never accept organization_id or role
  // from the request body or from mutable JWT user metadata.
  const [actorLookup, targetLookup] = await Promise.all([
    service.from('profiles')
      .select('id,organization_id,role,is_blocked')
      .eq('id',authUserId).maybeSingle(),
    service.from('profiles')
      .select('id,organization_id,role,is_blocked')
      .eq('id',payload.target_user_id).maybeSingle(),
  ]);
  if (actorLookup.error || targetLookup.error) {
    return response(503,{error:'Não foi possível verificar as permissões.'});
  }
  const actor = actorLookup.data as MemberRecord | null;
  const target = targetLookup.data as MemberRecord | null;
  const decision = mayRevokeMember(actor,target,authUserId);
  if (decision.allowed === false) {
    return response(403,{error:decision.message,code:decision.code});
  }

  // Fail closed FIRST: blocked profiles lose access through the existing
  // nexus_auth_org_id() and nexus_is_admin() RLS helpers, even if a JWT from
  // an earlier session remains valid temporarily.
  const { data: blocked, error: blockError } = await service.from('profiles')
    .update({is_blocked:true})
    .eq('id',payload.target_user_id)
    .eq('organization_id',actor!.organization_id)
    .select('id').maybeSingle();
  if (blockError || !blocked) {
    return response(409,{error:'Não foi possível confirmar o bloqueio do perfil.'});
  }

  // Ban refresh/logins for 100 years (documented Supabase Auth API).
  // This does NOT guarantee immediate revocation of all issued JWTs.
  // Database RLS is therefore essential to deny the blocked account.
  const {data: banned,error:banError} = await service.auth.admin.updateUserById(
    payload.target_user_id, {ban_duration:'876000h'},
  );
  if (banError || banned?.user?.id !== payload.target_user_id) {
    console.error('Revocation requires reconciliation', {
      stage:'auth_ban', targetId:payload.target_user_id,
      code:banError?.status ?? 'missing_confirmation',
    });
    return response(502,{
      error:'Perfil bloqueado, mas o bloqueio do Supabase Auth não foi confirmado. Suporte técnico necessário.',
      code:'REVOCATION_PARTIAL',
      partial:true,
    });
  }

  const {error:auditError} = await service.from('audit_logs').insert({
    organization_id:actor!.organization_id,
    user_id:authUserId,
    action:'revoke_member_access',
    entity:'profile',
    entity_id:payload.target_user_id,
    details:{method:'auth_ban_and_profile_block'},
  });
  if (auditError) {
    console.error('Revocation audit failure', {targetId:payload.target_user_id,code:auditError.code});
    return response(502,{
      error:'A conta foi bloqueada, mas o registro de auditoria não foi confirmado. Suporte técnico necessário.',
      code:'REVOCATION_AUDIT_FAILED',
      partial:true,
    });
  }
  return response(200,{success:true,blocked:true,member_id:payload.target_user_id});
});
