-- Historical execution note: target project is selected by the deployment configuration.
-- No browser client may assign itself a leader/coordinator/controller scope.
-- Scope assignment is reserved for a future reviewed admin/server workflow.
DO $preflight$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='private') THEN
    RAISE EXCEPTION 'Expected private schema does not exist';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='profiles' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'RLS must be enabled on profiles';
  END IF;
END $preflight$;

DO $constraint$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid='public.profiles'::regclass AND conname='profiles_organization_id_id_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_id_key
      UNIQUE (organization_id,id);
  END IF;
END $constraint$;

DO $role$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass
    AND conname='profiles_role_check') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('superadmin','admin','manager','coordinator','controller',
                   'leader','operator','viewer'));
END $role$;

CREATE TABLE IF NOT EXISTS private.nexus_team_memberships (
  user_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  coordinator_id uuid,
  leader_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nexus_team_membership_exactly_one
    CHECK ((coordinator_id IS NOT NULL) <> (leader_id IS NOT NULL)),
  CONSTRAINT nexus_team_membership_profile_fk
    FOREIGN KEY (organization_id,user_id)
    REFERENCES public.profiles(organization_id,id) ON DELETE CASCADE,
  CONSTRAINT nexus_team_membership_coordinator_fk
    FOREIGN KEY (organization_id,coordinator_id)
    REFERENCES public.coordinators(organization_id,id) ON DELETE RESTRICT,
  CONSTRAINT nexus_team_membership_leader_fk
    FOREIGN KEY (organization_id,leader_id)
    REFERENCES public.leaders(organization_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS private.nexus_controller_scopes (
  organization_id uuid NOT NULL,
  controller_user_id uuid NOT NULL,
  coordinator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,controller_user_id,coordinator_id),
  CONSTRAINT nexus_controller_profile_fk
    FOREIGN KEY (organization_id,controller_user_id)
    REFERENCES public.profiles(organization_id,id) ON DELETE CASCADE,
  CONSTRAINT nexus_controller_coordinator_fk
    FOREIGN KEY (organization_id,coordinator_id)
    REFERENCES public.coordinators(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS nexus_team_memberships_org_coordinator_idx
  ON private.nexus_team_memberships(organization_id,coordinator_id);
CREATE INDEX IF NOT EXISTS nexus_team_memberships_org_leader_idx
  ON private.nexus_team_memberships(organization_id,leader_id);
CREATE INDEX IF NOT EXISTS nexus_controller_scopes_controller_idx
  ON private.nexus_controller_scopes(controller_user_id,organization_id);

ALTER TABLE private.nexus_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.nexus_controller_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.nexus_team_memberships,private.nexus_controller_scopes
  FROM PUBLIC,anon,authenticated;
-- No policy is defined: browser access always denied.
-- Memberships can be maintained only by authorized server-side administration.

CREATE OR REPLACE FUNCTION private.nexus_can_read_leader(p_org uuid,p_leader uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    JOIN public.leaders l ON l.organization_id=p_org AND l.id=p_leader
    WHERE p.id=(SELECT auth.uid()) AND p.organization_id=p_org
      AND p.is_blocked=false
      AND (
        p.role IN ('admin','superadmin')
        OR (p.role='leader' AND EXISTS(
          SELECT 1 FROM private.nexus_team_memberships a
          WHERE a.user_id=p.id AND a.organization_id=p_org AND a.leader_id=l.id))
        OR (p.role='coordinator' AND EXISTS(
          SELECT 1 FROM private.nexus_team_memberships a
          WHERE a.user_id=p.id AND a.organization_id=p_org
            AND a.coordinator_id=l.coordinator_id))
        OR (p.role='controller' AND EXISTS(
          SELECT 1 FROM private.nexus_controller_scopes c
          WHERE c.controller_user_id=p.id AND c.organization_id=p_org
            AND c.coordinator_id=l.coordinator_id))
      )
  )
$fn$;

CREATE OR REPLACE FUNCTION private.nexus_can_read_coordinator(p_org uuid,p_coordinator uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    JOIN public.coordinators c ON c.organization_id=p_org AND c.id=p_coordinator
    WHERE p.id=(SELECT auth.uid()) AND p.organization_id=p_org
      AND p.is_blocked=false
      AND (
        p.role IN ('admin','superadmin')
        OR (p.role='coordinator' AND EXISTS(
          SELECT 1 FROM private.nexus_team_memberships a
          WHERE a.user_id=p.id AND a.organization_id=p_org
            AND a.coordinator_id=c.id))
        OR (p.role='controller' AND EXISTS(
          SELECT 1 FROM private.nexus_controller_scopes s
          WHERE s.controller_user_id=p.id AND s.organization_id=p_org
            AND s.coordinator_id=c.id))
      )
  )
$fn$;

REVOKE ALL ON FUNCTION private.nexus_can_read_leader(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.nexus_can_read_coordinator(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.nexus_can_read_leader(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.nexus_can_read_coordinator(uuid,uuid) TO authenticated;
