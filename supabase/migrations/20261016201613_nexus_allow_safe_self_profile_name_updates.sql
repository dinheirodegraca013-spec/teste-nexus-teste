-- Supabase DEV qidstqsbxwkbkwowhpab
-- Applied remotely via Supabase MCP as migration 20261016201613.
-- Browser users may update their own display name, not role, tenant, email
-- or blocked status. Both column GRANTS and RLS must enforce the restriction.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='profiles' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS must be enabled on public.profiles';
  END IF;
END
$guard$;

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profile_update_own_name ON public.profiles;
CREATE POLICY profile_update_own_name
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  );
