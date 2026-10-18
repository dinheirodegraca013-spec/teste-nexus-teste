-- REVIEW ONLY. NOT APPLIED. Requires specific user approval under AGENTS.md.
-- Supabase DEV only: qidstqsbxwkbkwowhpab
-- Verified on 2026-10-16: storage.buckets has zero rows and storage.objects
-- has zero user-created RLS policies in authorized DEV.
--
-- Private bucket with admin-only, tenant-prefixed object keys.
-- No PUBLIC storage URL, no unauthenticated reads, NO UPDATE policy.
-- User accounts/roles and module write permissions are unchanged.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR
     to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Supabase Storage tables are missing; do not install';
  END IF;
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='nexus-evidence-private') THEN
    RAISE EXCEPTION 'Bucket already exists; audit configuration before retry';
  END IF;
  IF EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname LIKE 'nexus_private_evidence_%'
  ) THEN
    RAISE EXCEPTION 'Existing evidence RLS policies require human review';
  END IF;
  IF to_regprocedure('private.nexus_auth_org_id()') IS NULL OR
     to_regprocedure('private.nexus_is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Missing required tenant authorization helpers';
  END IF;
END $preflight$;

INSERT INTO storage.buckets (
  id,name,public,file_size_limit,allowed_mime_types
) VALUES (
  'nexus-evidence-private','nexus-evidence-private',false,5242880,
  ARRAY['image/jpeg','image/png','image/webp']::text[]
);

-- Every filename must be a random UUID with a supported extension.
-- Since all three policies use the same condition, path changes across
-- tenants are not possible via direct browser Storage API requests.
CREATE POLICY nexus_private_evidence_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id='nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
    AND name ~ (
      '^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\\.(jpg|png|webp)$'
    )
  );

CREATE POLICY nexus_private_evidence_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id='nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
    AND name ~ (
      '^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\\.(jpg|png|webp)$'
    )
  );

-- Needed for compensation when a new upload succeeds but its DB write fails.
CREATE POLICY nexus_private_evidence_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id='nexus-evidence-private'
    AND (SELECT private.nexus_is_admin())
    AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
    AND name ~ (
      '^' || (SELECT private.nexus_auth_org_id())::text ||
      '/(presences|cars|houses)/[0-9a-f-]{36}\\.(jpg|png|webp)$'
    )
  );

-- No UPDATE policy: uploads use upsert:false and immutable randomized paths.
COMMIT;

-- POST-APPROVAL VERIFICATION (read only; execute only after approved rollout):
-- SELECT id, public, file_size_limit,allowed_mime_types FROM storage.buckets
-- WHERE id='nexus-evidence-private';
-- SELECT policyname,cmd,roles,qual,with_check FROM pg_policies
-- WHERE schemaname='storage' AND tablename='objects'
-- AND policyname LIKE 'nexus_private_evidence_%';
--
-- REQUIRE AUTHENTICATED NEGATIVE TESTS:
-- anonymous, same-org leader, blocked user, cross-org admin, invalid path,
-- oversized file, MIME spoof, public URL, pre-signed URL after expiry,
-- unauthorized delete and update. Only then enable UI uploads.
