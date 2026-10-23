-- Remove direct reads of private membership tables from public RLS policies.
-- Membership checks stay inside SECURITY DEFINER helpers, so authenticated
-- users never need table privileges on the private schema.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='leaders'
      AND policyname='leaders_read' AND cmd='SELECT'
  ) THEN
    RAISE EXCEPTION 'Expected leaders_read SELECT policy is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='coordinators'
      AND policyname='coordinators_read' AND cmd='SELECT'
  ) THEN
    RAISE EXCEPTION 'Expected coordinators_read SELECT policy is missing';
  END IF;
END $preflight$;

DROP POLICY IF EXISTS leaders_read ON public.leaders;
CREATE POLICY leaders_read ON public.leaders FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND (
    (SELECT private.nexus_is_admin())
    OR (
      private.nexus_can_read_leader(organization_id,id)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_module_permissions u
          WHERE u.user_id=(SELECT auth.uid())
            AND u.module_key='leaders' AND u.can_read=true
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id=(SELECT auth.uid()) AND p.role='leader' AND p.is_blocked=false
          )
          AND EXISTS (
            SELECT 1 FROM public.user_module_permissions u
            WHERE u.user_id=(SELECT auth.uid())
              AND u.module_key IN ('field','crm','presence','stickers')
              AND u.can_read=true
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS coordinators_read ON public.coordinators;
CREATE POLICY coordinators_read ON public.coordinators FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND (
    (SELECT private.nexus_is_admin())
    OR (
      private.nexus_can_read_coordinator(organization_id,id)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_module_permissions u
          WHERE u.user_id=(SELECT auth.uid())
            AND u.module_key='coordinators' AND u.can_read=true
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id=(SELECT auth.uid()) AND p.role='coordinator' AND p.is_blocked=false
          )
          AND EXISTS (
            SELECT 1 FROM public.user_module_permissions u
            WHERE u.user_id=(SELECT auth.uid())
              AND u.module_key IN ('field','crm','presence','stickers')
              AND u.can_read=true
          )
        )
      )
    )
  )
);

COMMIT;
