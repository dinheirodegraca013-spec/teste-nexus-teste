// REVIEW ONLY. This helper is used by a proposed Edge Function which must
// NOT be deployed without specific approval and authenticated E2E tests.
export type MemberRecord = {
  id: string;
  organization_id: string;
  role: string;
  is_blocked: boolean;
};
export type PermissionDecision =
  | { allowed: true }
  | { allowed: false; code: string; message: string };

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function mayRevokeMember(
  actor: MemberRecord | null,
  target: MemberRecord | null,
  authUserId: string,
): PermissionDecision {
  if (!actor || !target || !isUuid(authUserId) ||
      !isUuid(actor.id) || !isUuid(target.id) ||
      !isUuid(actor.organization_id) || !isUuid(target.organization_id)) {
    return { allowed:false, code:'MEMBER_NOT_FOUND', message:'Conta ou organização inválida.' };
  }
  if (actor.id !== authUserId || actor.is_blocked ||
      (actor.role !== 'admin' && actor.role !== 'superadmin')) {
    return { allowed:false, code:'ADMIN_ONLY', message:'Somente administradores ativos podem revogar membros.' };
  }
  if (target.organization_id !== actor.organization_id) {
    return { allowed:false, code:'CROSS_TENANT_DENIED', message:'O membro pertence a outra organização.' };
  }
  if (target.id === actor.id || ['admin','superadmin'].includes(target.role)) {
    return { allowed:false, code:'PRIVILEGED_TARGET_DENIED', message:'Não é permitido revogar administradores por esta operação.' };
  }
  if (!['coordinator','controller','leader','manager','operator','viewer'].includes(target.role)) {
    return { allowed:false, code:'UNSUPPORTED_ROLE', message:'Cargo do usuário não permitido.' };
  }
  return { allowed:true };
}
