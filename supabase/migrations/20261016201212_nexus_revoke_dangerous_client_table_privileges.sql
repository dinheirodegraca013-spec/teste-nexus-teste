-- Historical execution note: target project is selected by the deployment configuration.
-- Applied remotely via Supabase MCP on 2026-10-16, registered as 20261016201212.
-- SECURITY: TRUNCATE bypasses RLS; browser users never need TRUNCATE,
-- TRIGGER or REFERENCES on the tenant identity and permissions tables.
-- Non-destructive: all rows and standard SELECT/INSERT/UPDATE/DELETE grants remain.
DO $check$
BEGIN
  IF (SELECT count(*)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'
        AND c.relname IN ('organizations','profiles','user_module_permissions')
        AND c.relkind='r' AND c.relrowsecurity) <> 3 THEN
    RAISE EXCEPTION 'NEXUS control table invariant failed: expected 3 RLS-enabled tables';
  END IF;
END
$check$;

REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.organizations, public.profiles, public.user_module_permissions
  FROM authenticated;

REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.organizations, public.profiles, public.user_module_permissions
  FROM PUBLIC, anon;

-- Verification (read only): SELECT has_table_privilege('authenticated',
-- 'public.profiles', 'TRUNCATE'); -- false. Repeat for other tables and actions.
-- service_role intentionally keeps its administrative privileges.
