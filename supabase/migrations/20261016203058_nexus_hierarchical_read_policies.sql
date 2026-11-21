-- NEXUS development: team-scoped READ only; CRUD write remains admin-only.
-- Rows without a leader assignment remain visible only to tenant admins.
DO $guard$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leaders','coordinators','crm_contacts','field_presences']
  LOOP
    IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT') <> 1 THEN
      RAISE EXCEPTION 'Unexpected SELECT policy count for %',t;
    END IF;
  END LOOP;
END $guard$;

DROP POLICY IF EXISTS leaders_read ON public.leaders;
CREATE POLICY leaders_read ON public.leaders FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND private.nexus_can_read_leader(organization_id,id)
);

DROP POLICY IF EXISTS coordinators_read ON public.coordinators;
CREATE POLICY coordinators_read ON public.coordinators FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND private.nexus_can_read_coordinator(organization_id,id)
);

DROP POLICY IF EXISTS crm_contacts_read ON public.crm_contacts;
CREATE POLICY crm_contacts_read ON public.crm_contacts FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND (
    (SELECT private.nexus_is_admin())
    OR (leader_id IS NOT NULL
        AND private.nexus_can_read_leader(organization_id,leader_id))
  )
);

DROP POLICY IF EXISTS field_presences_read ON public.field_presences;
CREATE POLICY field_presences_read ON public.field_presences FOR SELECT TO authenticated
USING (
  organization_id=(SELECT private.nexus_auth_org_id())
  AND (
    (SELECT private.nexus_is_admin())
    OR (leader_id IS NOT NULL
        AND private.nexus_can_read_leader(organization_id,leader_id))
  )
);

-- Strictly no INSERT/UPDATE/DELETE expansions here.
