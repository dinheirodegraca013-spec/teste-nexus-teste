-- Organize private evidence by tenant and authenticated hierarchy.
-- Path: <org>/<scope>/<user>/<kind>/<uuid>.<ext>
-- Admins can read the tenant; coordinators can read their own and their
-- leaders' objects; leaders and other members can read their own objects.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='nexus-evidence-private' AND public=false) THEN
    RAISE EXCEPTION 'Expected private evidence bucket is missing';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('nexus_private_evidence_select','nexus_private_evidence_insert','nexus_private_evidence_delete')) <> 3 THEN
    RAISE EXCEPTION 'Expected three evidence policies are missing';
  END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION private.nexus_evidence_can_access(p_org uuid, p_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_scope text := split_part(p_name,'/',2);
  v_owner uuid;
  v_current_org uuid;
  v_current_role text;
  v_current_coord uuid;
BEGIN
  IF p_name !~ ('^' || p_org::text || '/(admin|coordinator|leader|member)/[0-9a-f-]{36}/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$') THEN
    RETURN false;
  END IF;
  v_owner := split_part(p_name,'/',3)::uuid;
  SELECT organization_id, role INTO v_current_org, v_current_role
    FROM public.profiles
    WHERE id=(SELECT auth.uid()) AND is_blocked=false;
  IF v_current_org IS DISTINCT FROM p_org THEN RETURN false; END IF;
  IF v_current_role IN ('admin','superadmin') THEN RETURN true; END IF;
  IF v_owner=(SELECT auth.uid()) THEN RETURN true; END IF;
  IF v_current_role='coordinator' AND v_scope='leader' THEN
    SELECT m.coordinator_id INTO v_current_coord
      FROM private.nexus_team_memberships m
      WHERE m.user_id=(SELECT auth.uid()) AND m.organization_id=p_org;
    RETURN EXISTS (
      SELECT 1
      FROM private.nexus_team_memberships m
      JOIN public.leaders l ON l.organization_id=p_org AND l.id=m.leader_id
      JOIN public.profiles p ON p.id=m.user_id AND p.organization_id=p_org
      WHERE m.user_id=v_owner AND m.organization_id=p_org
        AND l.coordinator_id=v_current_coord AND p.role='leader' AND p.is_blocked=false
    );
  END IF;
  RETURN false;
END $fn$;

CREATE OR REPLACE FUNCTION private.nexus_evidence_can_upload(p_org uuid, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.organization_id=p_org AND p.is_blocked=false
      AND p_name ~ ('^' || p_org::text || '/(admin|coordinator|leader|member)/' ||
        (SELECT auth.uid())::text || '/(presences|cars|houses)/[0-9a-f-]{36}\.(jpg|png|webp)$')
      AND split_part(p_name, '/', 2) = CASE
        WHEN p.role IN ('admin','superadmin') THEN 'admin'
        WHEN p.role = 'coordinator' THEN 'coordinator'
        WHEN p.role = 'leader' THEN 'leader'
        ELSE 'member'
      END
  )
$fn$;

REVOKE ALL ON FUNCTION private.nexus_evidence_can_access(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.nexus_evidence_can_upload(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.nexus_evidence_can_access(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.nexus_evidence_can_upload(uuid,text) TO authenticated;

DROP POLICY nexus_private_evidence_select ON storage.objects;
CREATE POLICY nexus_private_evidence_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='nexus-evidence-private'
  AND private.nexus_evidence_can_access((SELECT private.nexus_auth_org_id()),name)
);

DROP POLICY nexus_private_evidence_insert ON storage.objects;
CREATE POLICY nexus_private_evidence_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='nexus-evidence-private'
  AND private.nexus_evidence_can_upload((SELECT private.nexus_auth_org_id()),name)
);

DROP POLICY nexus_private_evidence_delete ON storage.objects;
CREATE POLICY nexus_private_evidence_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='nexus-evidence-private'
  AND (SELECT private.nexus_is_admin())
  AND (storage.foldername(name))[1]=(SELECT private.nexus_auth_org_id())::text
);

COMMIT;
