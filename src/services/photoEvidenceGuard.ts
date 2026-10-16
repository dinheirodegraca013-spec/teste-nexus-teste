/**
 * Temporary privacy boundary until NEXUS has a private Storage bucket and
 * tenant-scoped storage policies. FileUpload currently produces data: URLs.
 * Embedded photos must never be inserted into public CRM/field table rows.
 */
export function validatePhotoReference(
  payload: { photo_url?: string | null; organization_id?: string | null }
): { code: string; message: string } | null {
  if (payload.photo_url == null || payload.photo_url === '') return null;
  if (typeof payload.photo_url !== 'string') {
    return { code: 'PHOTO_REFERENCE_INVALID', message: 'Referência de foto inválida.' };
  }
  // The only supported future representation is a relative, tenant-prefixed
  // object key. External URLs, base64, blob URLs, and arbitrary paths are denied.
  const org = payload.organization_id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const reference = payload.photo_url.trim();
  if (!org || !uuid.test(org) || reference.length > 250 ||
      !reference.startsWith(org + '/') ||
      !new RegExp('^' + org + '/[a-zA-Z0-9/_-]+\\.(?:jpg|jpeg|png|webp)$', 'i').test(reference) ||
      reference.includes('..') || reference.includes('//')) {
    return {
      code: 'PRIVATE_PHOTO_STORAGE_REQUIRED',
      message: 'A foto não pode ser salva diretamente no banco. O Storage privado da campanha ainda precisa ser habilitado. Remova o anexo para salvar o registro sem foto.',
    };
  }
  return null;
}
