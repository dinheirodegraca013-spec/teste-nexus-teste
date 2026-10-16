-- Scope RBAC permission reads, updates and deletes to the caller's organization.
DROP POLICY IF EXISTS "Permissions read own or admin" ON public.user_module_permissions;
CREATE POLICY "Permissions read own or admin"
ON public.user_module_permissions
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (
    private.nexus_is_admin()
    AND EXISTS (
      SELECT 1
      FROM public.profiles target_profile
      WHERE target_profile.id = user_module_permissions.user_id
        AND target_profile.organization_id = private.get_auth_org_id()
    )
  )
);

DROP POLICY IF EXISTS "Only admins delete permissions" ON public.user_module_permissions;
CREATE POLICY "Only admins delete permissions"
ON public.user_module_permissions
FOR DELETE
TO authenticated
USING (
  private.nexus_is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = user_module_permissions.user_id
      AND target_profile.organization_id = private.get_auth_org_id()
  )
);

DROP POLICY IF EXISTS "Only admins update permissions" ON public.user_module_permissions;
CREATE POLICY "Only admins update permissions"
ON public.user_module_permissions
FOR UPDATE
TO authenticated
USING (
  private.nexus_is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = user_module_permissions.user_id
      AND target_profile.organization_id = private.get_auth_org_id()
  )
)
WITH CHECK (
  private.nexus_is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = user_module_permissions.user_id
      AND target_profile.organization_id = private.get_auth_org_id()
  )
);
