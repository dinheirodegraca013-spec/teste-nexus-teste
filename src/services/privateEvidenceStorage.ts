import { supabase } from '../lib/supabase';

export const EVIDENCE_BUCKET = 'nexus-evidence-private';
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export type EvidenceKind = 'presences' | 'cars' | 'houses';
export type EvidenceObject = { path: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_KEY = /^([0-9a-f-]{36})\/(admin|coordinator|leader|member)\/([0-9a-f-]{36})\/(presences|cars|houses)\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;
const SIGNED_URL_SECONDS = 60;

type StorageFailure = { code: string; message: string };
type StorageResult<T> = { data: T | null; error: StorageFailure | { message: string } | null };

function fail<T>(code: string, message: string): StorageResult<T> {
  return { data: null, error: { code, message } };
}

/**
 * A reference is a private object key, NEVER a base64 string, arbitrary URL
 * or public storage URL. Tenant isolation is rechecked by Supabase Storage RLS.
 */
export function isTenantEvidencePath(path: string, tenantId: string): boolean {
  if (!UUID.test(tenantId) || typeof path !== 'string' || path.length > 250) return false;
  const match = OBJECT_KEY.exec(path);
  return Boolean(match && UUID.test(match[3]) && UUID.test(match[5]) &&
    match[1].toLowerCase() === tenantId.toLowerCase());
}

/**
 * Validate real file magic bytes, not just user-supplied filename or MIME.
 * This is defense in depth; Storage enforces MIME and size on the server.
 */
export async function inspectEvidenceImage(file: Blob): Promise<
  { mime: string; extension: string } | StorageFailure
> {
  if (!file || typeof file.arrayBuffer !== 'function' ||
      !Number.isFinite(file.size) || file.size < 12 ||
      file.size > MAX_EVIDENCE_BYTES) {
    return { code: 'EVIDENCE_FILE_INVALID', message: 'Foto vazia ou acima de 5 MB.' };
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let mime = '';
  let extension = '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mime = 'image/jpeg'; extension = 'jpg';
  } else if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    mime = 'image/png'; extension = 'png';
  } else if ([82, 73, 70, 70].every((n,i) => bytes[i] === n) &&
    [87, 69, 66, 80].every((n,i) => bytes[i + 8] === n)) {
    mime = 'image/webp'; extension = 'webp';
  } else {
    return { code: 'EVIDENCE_TYPE_REJECTED', message: 'Use JPG, PNG ou WebP válido.' };
  }
  if (file.type && file.type !== mime) {
    return { code: 'EVIDENCE_MIME_MISMATCH', message: 'O tipo declarado não corresponde ao arquivo.' };
  }
  return { mime, extension };
}

type TenantMemberContext = { userId: string; scope: 'admin' | 'coordinator' | 'leader' | 'member' };

function evidenceScope(role: unknown): TenantMemberContext['scope'] {
  if (role === 'admin' || role === 'superadmin') return 'admin';
  if (role === 'coordinator') return 'coordinator';
  if (role === 'leader') return 'leader';
  return 'member';
}

async function requireActiveTenantMember(orgId: string): Promise<TenantMemberContext | StorageFailure> {
  if (!UUID.test(orgId)) {
    return { code: 'INVALID_TENANT', message: 'Organização inválida.' };
  }
  // getUser() verifies the token with the authentication server, unlike
  // merely trusting cached session claims or an organization id from the UI.
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) {
    return { code: 'NOT_AUTHENTICATED', message: 'Autenticação obrigatória.' };
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id,role,is_blocked')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.is_blocked ||
      profile.organization_id !== orgId ||
      !profile.role) {
    return { code: 'TENANT_MEMBER_REQUIRED', message: 'Acesso de membro ativo da organização é obrigatório.' };
  }
  return { userId: auth.user.id, scope: evidenceScope(profile.role) };
}

/**
 * The private bucket and tenant-scoped policies are deployed through the
 * versioned migration in the authorized DEV project; this service never
 * falls back to a public URL.
 */
export async function uploadPrivateEvidence(
  orgId: string, kind: EvidenceKind, file: Blob
): Promise<StorageResult<EvidenceObject>> {
  if (!['presences', 'cars', 'houses'].includes(kind)) {
    return fail('INVALID_EVIDENCE_KIND', 'Tipo de comprovante não permitido.');
  }
  const inspected = await inspectEvidenceImage(file);
  if ('code' in inspected) return { data: null, error: inspected };
  const member = await requireActiveTenantMember(orgId);
  if ('code' in member) return { data: null, error: member };

  const key = `${orgId}/${member.scope}/${member.userId}/${kind}/${crypto.randomUUID()}.${inspected.extension}`;
  const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET)
    .upload(key, file, {
      upsert: false,
      cacheControl: '0',
      contentType: inspected.mime,
    });
  if (error) return { data: null, error };
  if (!data?.path || data.path !== key) {
    return fail('EVIDENCE_UPLOAD_NOT_CONFIRMED', 'Storage não confirmou o arquivo privado.');
  }
  return { data: { path: key }, error: null };
}

/**
 * Converts the local preview produced by FileUpload into a private Storage
 * object. Data URLs never cross into Postgres; only the tenant-scoped object
 * key is returned to the operational services.
 */
export async function uploadPrivateEvidenceDataUrl(
  orgId: string, kind: EvidenceKind, dataUrl: string,
): Promise<StorageResult<EvidenceObject>> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return fail('EVIDENCE_DATA_URL_INVALID', 'A foto selecionada não é uma imagem válida.');
  }
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return uploadPrivateEvidence(orgId, kind, blob);
  } catch {
    return fail('EVIDENCE_PREPARE_FAILED', 'Não foi possível preparar a foto para o Storage privado.');
  }
}

export async function getPrivateEvidenceUrl(
  orgId: string, path: string
): Promise<StorageResult<{ url: string }>> {
  if (!isTenantEvidencePath(path, orgId)) {
    return fail('INVALID_EVIDENCE_PATH', 'Comprovante não pertence à organização.');
  }
  const member = await requireActiveTenantMember(orgId);
  if ('code' in member) return { data: null, error: member };

  const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) return { data: null, error };
  if (!data?.signedUrl) {
    return fail('SIGNED_URL_NOT_CONFIRMED', 'Storage não retornou URL temporária.');
  }
  return { data: { url: data.signedUrl }, error: null };
}
