-- Restrict module reads to administrators and explicitly permitted scoped users.
-- Approved for Supabase DEV project qidstqsbxwkbkwowhpab on 2026-10-16.
BEGIN;
DO $migration$
DECLARE rec record;
DECLARE new_qual text;
DECLARE scoped text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_module_permissions'
      AND column_name='module_key'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_module_permissions'
      AND column_name='can_read'
  ) THEN
    RAISE EXCEPTION 'Module permissions schema mismatch; abort';
  END IF;

  FOR rec IN SELECT * FROM (VALUES
    ('goals','goals','aggregate'),
    ('campaign_events','events','aggregate'),
    ('meetings','meetings','aggregate'),
    ('materials_inventory','materials','aggregate'),
    ('material_distributions','materials','aggregate'),
    ('leaders','leaders','leader'),
    ('coordinators','coordinators','coordinator'),
    ('crm_contacts','crm','crm'),
    ('field_presences','presence','crm')
  ) AS mapping(table_name,module_key,scope)
  LOOP
    IF (
      SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename=rec.table_name AND cmd='SELECT'
        AND policyname=rec.table_name || '_read'
        AND qual LIKE '%nexus_auth_org_id%'
    ) <> 1
    OR (
      SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename=rec.table_name AND cmd='SELECT'
    ) <> 1 THEN
      RAISE EXCEPTION 'Unexpected RLS policy on public.%',rec.table_name;
    END IF;
  END LOOP;

  FOR rec IN SELECT * FROM (VALUES
    ('goals','goals','aggregate'),
    ('campaign_events','events','aggregate'),
    ('meetings','meetings','aggregate'),
    ('materials_inventory','materials','aggregate'),
    ('material_distributions','materials','aggregate'),
    ('leaders','leaders','leader'),
    ('coordinators','coordinators','coordinator'),
    ('crm_contacts','crm','crm'),
    ('field_presences','presence','crm')
  ) AS mapping(table_name,module_key,scope)
  LOOP
    IF rec.scope='aggregate' THEN
      scoped := format(
        '(EXISTS (SELECT 1 FROM public.profiles p
           WHERE p.id=(SELECT auth.uid())
             AND p.organization_id=(SELECT private.nexus_auth_org_id())
             AND p.is_blocked=false
             AND p.role IN (''manager'',''operator'',''viewer'')))'
      );
    ELSIF rec.scope='leader' THEN
      scoped := 'private.nexus_can_read_leader(organization_id,id)';
    ELSIF rec.scope='coordinator' THEN
      scoped := 'private.nexus_can_read_coordinator(organization_id,id)';
    ELSE
      scoped := '(leader_id IS NOT NULL AND private.nexus_can_read_leader(organization_id,leader_id))';
    END IF;

    new_qual := format(
      'organization_id=(SELECT private.nexus_auth_org_id())
        AND (
          (SELECT private.nexus_is_admin())
          OR (
            %s
            AND EXISTS (
              SELECT 1 FROM public.user_module_permissions u
              WHERE u.user_id=(SELECT auth.uid())
                AND u.module_key=%L AND u.can_read=true
            )
          )
        )',
      scoped,rec.module_key
    );

    EXECUTE format('DROP POLICY %I ON public.%I',
      rec.table_name || '_read',rec.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      rec.table_name || '_read',rec.table_name,new_qual);
  END LOOP;
END $migration$;
COMMIT;
