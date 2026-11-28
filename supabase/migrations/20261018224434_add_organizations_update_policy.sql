-- Applied in Supabase DEV qwvbvqlzcyfkuszxrlgv.
DROP POLICY IF EXISTS organizations_update ON public.organizations;

CREATE POLICY organizations_update
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT private.nexus_auth_org_id())
    AND (SELECT private.nexus_is_admin())
  )
  WITH CHECK (
    id = (SELECT private.nexus_auth_org_id())
    AND (SELECT private.nexus_is_admin())
  );
