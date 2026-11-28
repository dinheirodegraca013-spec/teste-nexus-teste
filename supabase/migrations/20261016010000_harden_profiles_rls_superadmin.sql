-- Harden profile self-provisioning and tenant-admin role escalation.
-- Historical execution note: do not infer a target project from this file.

CREATE OR REPLACE FUNCTION private.nexus_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND lower(
        regexp_replace(
          coalesce(p.role, ''),
          '[[:space:]_-]+',
          '',
          'g'
        )
      ) = 'superadmin'
  );
$$;

REVOKE ALL ON FUNCTION private.nexus_is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.nexus_is_superadmin() TO authenticated;

-- Profile creation is handled by the trusted provisioning function.
-- Authenticated clients must not assign themselves roles or organization IDs.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;

CREATE POLICY "Admins can update organization profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (
    private.nexus_is_admin()
    AND organization_id = private.get_auth_org_id()
    AND lower(
      regexp_replace(
        coalesce(role, ''),
        '[[:space:]_-]+',
        '',
        'g'
      )
    ) <> 'superadmin'
  )
  OR private.nexus_is_superadmin()
)
WITH CHECK (
  (
    organization_id = private.get_auth_org_id()
    AND lower(
      regexp_replace(
        coalesce(role, ''),
        '[[:space:]_-]+',
        '',
        'g'
      )
    ) <> 'superadmin'
  )
  OR private.nexus_is_superadmin()
);
