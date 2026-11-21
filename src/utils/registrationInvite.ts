export function readRegistrationInvite({ search, hash }: Pick<Location, 'search' | 'hash'>) {
  const hashQueryStart = hash.startsWith('#/') ? hash.indexOf('?') : -1;
  const params = new URLSearchParams(hashQueryStart >= 0 ? hash.slice(hashQueryStart) : search);
  const inviteType = params.get('convite');
  const leaderId = params.get('lider_id');
  const coordinatorId = params.get('coord_id') || params.get('coord');

  return {
    type: inviteType === 'coordenador' ? 'coordenador' as const
      : inviteType === 'lider' || leaderId || coordinatorId ? 'lider' as const : null,
    leaderId,
    coordinatorId,
    organizationId: params.get('org') || params.get('org_id'),
    name: params.get('nome'),
    email: params.get('email'),
    territory: params.get('territorio'),
  };
}
