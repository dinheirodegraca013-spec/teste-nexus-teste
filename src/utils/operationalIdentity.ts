type OperationalProfile = {
  id?: string | null;
  role?: unknown;
  full_name?: string | null;
};

export function getOperationalIdentity(profile: OperationalProfile | null, email?: string | null) {
  const role = String(profile?.role || '').toLowerCase();
  const restricted = role === 'leader' || role === 'coordinator';
  const registration = profile?.id
    ? `Registro #${profile.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : 'Registro não disponível';

  return {
    restricted,
    label: restricted ? registration : (profile?.full_name || 'Usuário'),
    email: email || 'E-mail não disponível',
  };
}
