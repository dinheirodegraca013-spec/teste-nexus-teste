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
      OR actual_policy NOT LIKE '%nexus_is_admin%'
      OR (SELECT count(*) FROM pg_policies WHERE schemaname='public'
          AND tablename=sensitive_table AND cmd='SELECT') <> 1 THEN
      RAISE EXCEPTION 'SECURITY CONTRACT FAILED: policy on %', sensitive_table;
    END IF;
  END LOOP;

  RAISE NOTICE 'NEXUS SECURITY CONTRACT OK: RLS, grants and policies';
END
$verify$;
