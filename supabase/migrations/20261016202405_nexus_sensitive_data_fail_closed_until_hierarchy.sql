-- Supabase DEV qidstqsbxwkbkwowhpab, applied 2026-10-16.
-- Temporary fail-closed RLS: frontend roles do not yet have a trustworthy
-- database mapping to leaders/coordinators/controllers. Until such a mapping
-- is implemented and tested, grant sensitive SELECT only to active admins
-- within their own tenant. Staff cannot read these tables during this phase.
-- Do not relax these rules until negative tests cover cross-team access.
DO $policy$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'crm_contacts', 'leaders', 'coordinators', 'field_presences',
    'car_stickers', 'house_stickers', 'popular_demands'
  ]
  LOOP
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname='public' AND tablename=relation_name
          AND cmd='SELECT' AND policyname=relation_name || '_read') <> 1
       OR (SELECT count(*) FROM pg_policies
           WHERE schemaname='public' AND tablename=relation_name
             AND cmd='SELECT') <> 1 THEN
      RAISE EXCEPTION 'Unexpected SELECT policies on %. Review before migration.', relation_name;
    END IF;
    EXECUTE format('DROP POLICY %I ON public.%I',
      relation_name || '_read', relation_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      || 'USING (organization_id = (SELECT private.nexus_auth_org_id()) '
      || 'AND (SELECT private.nexus_is_admin()))',
      relation_name || '_read', relation_name
    );
  END LOOP;
END
$policy$;
