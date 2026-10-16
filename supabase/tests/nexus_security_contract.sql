-- NEXUS DEV SECURITY CONTRACT (read-only assertions, no test fixtures)
-- Run against authorized Supabase project qidstqsbxwkbkwowhpab AFTER migrations.
-- This file does not create/alter accounts, data, functions, grants, or RLS.
DO $verify$
DECLARE
  table_name text;
  sensitive_table text;
  actual_policy text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'SECURITY CONTRACT FAILED: public table has RLS disabled';
  END IF;

  FOREACH table_name IN ARRAY ARRAY['organizations','profiles','user_module_permissions']
  LOOP
    IF has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
      OR has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER')
      OR has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES') THEN
      RAISE EXCEPTION 'SECURITY CONTRACT FAILED: sensitive privilege on %', table_name;
    END IF;
  END LOOP;

  IF NOT has_column_privilege('authenticated','public.profiles','name','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','phone','UPDATE')
    OR has_table_privilege('authenticated','public.profiles','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','role','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','email','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','organization_id','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','is_blocked','UPDATE') THEN
    RAISE EXCEPTION 'SECURITY CONTRACT FAILED: profile UPDATE grants';
  END IF;

  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename='profiles' AND cmd='UPDATE'
      AND policyname='profile_update_own_contact'
      AND qual ILIKE '%auth.uid%'
      AND with_check ILIKE '%auth.uid%') <> 1 THEN
    RAISE EXCEPTION 'SECURITY CONTRACT FAILED: own-profile RLS UPDATE';
  END IF;

  FOREACH sensitive_table IN ARRAY ARRAY[
    'crm_contacts','leaders','coordinators','field_presences',
    'car_stickers','house_stickers','popular_demands'
  ]
  LOOP
    SELECT qual INTO actual_policy
    FROM pg_policies
    WHERE schemaname='public' AND tablename=sensitive_table
      AND cmd='SELECT' AND policyname=sensitive_table || '_read';

    IF actual_policy IS NULL
      OR actual_policy NOT LIKE '%nexus_auth_org_id%'
      OR (
        CASE
          WHEN sensitive_table='leaders'
            THEN actual_policy NOT LIKE '%nexus_can_read_leader%'
          WHEN sensitive_table='coordinators'
            THEN actual_policy NOT LIKE '%nexus_can_read_coordinator%'
          WHEN sensitive_table IN ('crm_contacts','field_presences')
            THEN actual_policy NOT LIKE '%nexus_is_admin%'
              OR actual_policy NOT LIKE '%nexus_can_read_leader%'
          ELSE actual_policy NOT LIKE '%nexus_is_admin%'
        END
      )
      OR (SELECT count(*) FROM pg_policies WHERE schemaname='public'
          AND tablename=sensitive_table AND cmd='SELECT') <> 1 THEN
      RAISE EXCEPTION 'SECURITY CONTRACT FAILED: policy on %', sensitive_table;
    END IF;
  END LOOP;

  IF NOT EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid='public.profiles'::regclass
        AND conname='profiles_role_check'
        AND pg_get_constraintdef(oid) LIKE '%controller%') THEN
    RAISE EXCEPTION 'SECURITY CONTRACT FAILED: controller role constraint missing';
  END IF;

  FOREACH table_name IN ARRAY ARRAY['nexus_team_memberships','nexus_controller_scopes']
  LOOP
    IF NOT (SELECT c.relrowsecurity FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='private' AND c.relname=table_name)
      OR has_table_privilege('authenticated',format('private.%I',table_name),'SELECT')
      OR has_table_privilege('authenticated',format('private.%I',table_name),'INSERT')
      OR has_table_privilege('authenticated',format('private.%I',table_name),'UPDATE')
      OR has_table_privilege('authenticated',format('private.%I',table_name),'DELETE') THEN
      RAISE EXCEPTION 'SECURITY CONTRACT FAILED: hierarchy private grants on %',table_name;
    END IF;
  END LOOP;

  IF NOT has_function_privilege('authenticated','private.nexus_can_read_leader(uuid,uuid)','EXECUTE')
    OR NOT has_function_privilege('authenticated','private.nexus_can_read_coordinator(uuid,uuid)','EXECUTE')
    OR has_function_privilege('anon','private.nexus_can_read_leader(uuid,uuid)','EXECUTE')
    OR has_function_privilege('anon','private.nexus_can_read_coordinator(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'SECURITY CONTRACT FAILED: hierarchy helper execute grants';
  END IF;

  RAISE NOTICE 'NEXUS SECURITY CONTRACT OK: hierarchy, grants and RLS';
END
$verify$;
