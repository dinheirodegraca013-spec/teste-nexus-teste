-- NEXUS DEV private evidence storage. No public access and no UPDATE policy.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('nexus-evidence-private','nexus-evidence-private',false,5242880,ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS nexus_private_evidence_select ON storage.objects;
DROP POLICY IF EXISTS nexus_private_evidence_insert ON storage.objects;
DROP POLICY IF EXISTS nexus_private_evidence_delete ON storage.objects;
CREATE POLICY nexus_private_evidence_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='nexus-evidence-private' AND (SELECT private.nexus_is_admin())
  AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
  AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text || '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
CREATE POLICY nexus_private_evidence_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='nexus-evidence-private' AND (SELECT private.nexus_is_admin())
  AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
  AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text || '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
CREATE POLICY nexus_private_evidence_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='nexus-evidence-private' AND (SELECT private.nexus_is_admin())
  AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
  AND name ~ ('^' || (SELECT private.nexus_auth_org_id())::text || '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
