-- NEXUS DEV only. PREPARED, NOT EXECUTED.
-- Consolidates duplicate permissive policies reported by the Supabase performance advisor.
-- Requires explicit approval before execution on qwvbvqlzcyfkuszxrlgv.
BEGIN;

DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS profile_update_own_contact ON public.profiles;

CREATE POLICY profiles_update_admin_or_self
ON public.profiles
FOR UPDATE TO authenticated
USING (
  (
    private.nexus_is_admin()
    AND organization_id = private.get_auth_org_id()
    AND lower(regexp_replace(coalesce(role, ''), '[[:space:]_-]+', '', 'g')) <> 'superadmin'
  )
  OR private.nexus_is_superadmin()
  OR (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  )
)
WITH CHECK (
  (
    private.nexus_is_admin()
    AND
    organization_id = private.get_auth_org_id()
    AND lower(regexp_replace(coalesce(role, ''), '[[:space:]_-]+', '', 'g')) <> 'superadmin'
  )
  OR private.nexus_is_superadmin()
  OR (
    id = (SELECT auth.uid())
    AND organization_id = (SELECT private.nexus_auth_org_id())
    AND is_blocked = false
  )
);

DROP POLICY IF EXISTS permissions_read ON public.user_module_permissions;

-- Keep the existing tenant-scoped "Permissions read own or admin" policy.
COMMIT;

-- Read-only verification after approval:
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname='public'
--   AND tablename IN ('profiles','user_module_permissions')
-- ORDER BY tablename, policyname;
