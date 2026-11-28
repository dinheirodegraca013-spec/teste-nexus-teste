-- PROPOSTA — executar somente após aprovação específica para o DEV atual.
-- Destino: Supabase DEV qwvbvqlzcyfkuszxrlgv.
-- Corrige a expressão de extensão nas três policies privadas existentes.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'nexus-evidence-private' AND public = false
  ) THEN
    RAISE EXCEPTION 'Expected private bucket nexus-evidence-private is missing';
  END IF;
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname IN (
          'nexus_private_evidence_select',
          'nexus_private_evidence_insert',
          'nexus_private_evidence_delete'
        )) <> 3 THEN
    RAISE EXCEPTION 'Expected exactly three named evidence policies';
  END IF;
END $preflight$;

DROP POLICY nexus_private_evidence_select ON storage.objects;
DROP POLICY nexus_private_evidence_insert ON storage.objects;
DROP POLICY nexus_private_evidence_delete ON storage.objects;

CREATE POLICY nexus_private_evidence_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
    AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );

CREATE POLICY nexus_private_evidence_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
    AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );

CREATE POLICY nexus_private_evidence_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1] = (SELECT private.nexus_auth_org_id())::text
    AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );

COMMIT;

-- Verificação posterior somente leitura:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='storage' AND tablename='objects'
--   AND policyname IN ('nexus_private_evidence_select',
--                      'nexus_private_evidence_insert',
--                      'nexus_private_evidence_delete');
