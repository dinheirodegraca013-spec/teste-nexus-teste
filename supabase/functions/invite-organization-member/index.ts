import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizeRole(role: unknown): string {
  return String(role ?? "").toLowerCase().replace(/[\s_-]+/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Método não permitido." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Autenticação obrigatória." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Invite function is missing required Supabase environment configuration.");
    return jsonResponse(500, { error: "Serviço de convite não configurado." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(401, { error: "Sessão inválida ou expirada." });
  }

  let body: { email?: unknown; name?: unknown; role?: unknown; organization_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corpo da requisição inválido." });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, 120);
  const requestedRole = String(body.role ?? "operator").trim().toLowerCase();
  const requestedOrgId = String(body.organization_id ?? "");

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: "Informe um e-mail válido." });
  }

  // Convites comuns não podem conceder privilégio administrativo.
  const allowedRoles = new Set(["operator", "coordinator", "controller", "leader", "viewer", "manager"]);
  if (!allowedRoles.has(requestedRole)) {
    return jsonResponse(403, { error: "Esse nível de acesso não pode ser concedido por convite." });
  }

  const { data: caller, error: callerError } = await adminClient
    .from("profiles")
    .select("id, organization_id, role, is_blocked")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (callerError || !caller || caller.is_blocked) {
    return jsonResponse(403, { error: "Perfil autorizado não encontrado ou bloqueado." });
  }

  const callerRole = normalizeRole(caller.role);
  if (callerRole !== "admin" && callerRole !== "superadmin") {
    return jsonResponse(403, { error: "Somente administradores podem convidar membros." });
  }

  const organizationId = requestedOrgId || String(caller.organization_id ?? "");
  if (!organizationId) {
    return jsonResponse(400, { error: "Organização de destino obrigatória." });
  }
  if (callerRole !== "superadmin" && organizationId !== caller.organization_id) {
    return jsonResponse(403, { error: "Você não pode convidar membros para outra organização." });
  }

  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();
  if (organizationError || !organization) {
    return jsonResponse(400, { error: "Organização de destino inválida." });
  }

  const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: organizationId, role: requestedRole, name: name || email.split("@")[0] },
  });

  if (invitationError || !invitation.user) {
    console.error("Invite failed", { code: invitationError?.status, message: invitationError?.message });
    return jsonResponse(409, { error: "Não foi possível enviar o convite. Verifique se o e-mail já possui cadastro." });
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: invitation.user.id,
      organization_id: organizationId,
      name: name || email.split("@")[0],
      email,
      role: requestedRole,
      is_blocked: false,
    })
    .select("id, organization_id, name, email, role, created_at")
    .single();

  if (profileError || !profile) {
    console.error("Profile creation failed after invitation", {
      userId: invitation.user.id,
      code: profileError?.code,
    });
    return jsonResponse(500, {
      error: "O convite foi criado, mas o perfil não pôde ser concluído. A equipe técnica precisa finalizar o provisionamento.",
    });
  }

  return jsonResponse(200, { success: true, member: profile });
});
