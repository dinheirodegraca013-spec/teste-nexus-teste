-- NEXUS DEV: privileged enrollment of existing accounts into team scopes.
-- No browser direct writes to private scope tables; admin-only RPC validates
-- caller, target role, organization and foreign key links.
CREATE OR REPLACE FUNCTION public.nexus_set_team_scope(
  p_target_user uuid, p_coordinator uuid DEFAULT NULL, p_leader uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_org uuid;
  v_target_org uuid;
  v_target_role text;
  v_blocked boolean;
BEGIN
  SELECT organization_id INTO v_org FROM public.profiles
    WHERE id=(SELECT auth.uid()) AND is_blocked=false
      AND role IN ('admin','superadmin');
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Only active tenant admins may assign team scopes' USING ERRCODE='42501';
  END IF;
  SELECT organization_id,role,is_blocked
    INTO v_target_org,v_target_role,v_blocked
    FROM public.profiles WHERE id=p_target_user;
  IF v_target_org IS DISTINCT FROM v_org OR v_blocked IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Target member must be active and in your tenant' USING ERRCODE='42501';
  END IF;
  IF NOT (
    (v_target_role='leader' AND p_leader IS NOT NULL AND p_coordinator IS NULL)
    OR
    (v_target_role='coordinator' AND p_coordinator IS NOT NULL AND p_leader IS NULL)
  ) THEN
    RAISE EXCEPTION 'Target role and team scope do not match' USING ERRCODE='22023';
  END IF;
  INSERT INTO private.nexus_team_memberships(user_id,organization_id,coordinator_id,leader_id)
  VALUES(p_target_user,v_org,p_coordinator,p_leader)
  ON CONFLICT (user_id) DO UPDATE
    SET coordinator_id=EXCLUDED.coordinator_id,leader_id=EXCLUDED.leader_id,
        organization_id=EXCLUDED.organization_id;
  INSERT INTO public.audit_logs(organization_id,user_id,action,entity,entity_id,details)
  VALUES(v_org,(SELECT auth.uid()),'assign_team_scope','team_membership',p_target_user::text,
    jsonb_build_object('coordinator_id',p_coordinator,'leader_id',p_leader));
END $fn$;

CREATE OR REPLACE FUNCTION public.nexus_set_controller_scope(
  p_controller_user uuid,p_coordinator uuid,p_enabled boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.profiles
    WHERE id=(SELECT auth.uid()) AND is_blocked=false
      AND role IN ('admin','superadmin');
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Only active tenant admins may assign controller scopes' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.profiles
     WHERE id=p_controller_user AND organization_id=v_org
       AND role='controller' AND is_blocked=false
  ) THEN
    RAISE EXCEPTION 'Target must be an active controller in your tenant' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.coordinators
    WHERE organization_id=v_org AND id=p_coordinator
  ) THEN
    RAISE EXCEPTION 'Coordinator must be in your tenant' USING ERRCODE='42501';
  END IF;
  IF p_enabled IS TRUE THEN
    INSERT INTO private.nexus_controller_scopes(
      organization_id,controller_user_id,coordinator_id)
    VALUES(v_org,p_controller_user,p_coordinator) ON CONFLICT DO NOTHING;
  ELSIF p_enabled IS FALSE THEN
    DELETE FROM private.nexus_controller_scopes
    WHERE organization_id=v_org AND controller_user_id=p_controller_user
      AND coordinator_id=p_coordinator;
  ELSE
    RAISE EXCEPTION 'p_enabled cannot be null' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.audit_logs(organization_id,user_id,action,entity,entity_id,details)
  VALUES(v_org,(SELECT auth.uid()),
    CASE WHEN p_enabled THEN 'assign_controller_scope' ELSE 'revoke_controller_scope' END,
    'controller_scope',p_controller_user::text,
    jsonb_build_object('coordinator_id',p_coordinator));
END $fn$;

REVOKE ALL ON FUNCTION public.nexus_set_team_scope(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.nexus_set_controller_scope(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.nexus_set_team_scope(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_set_controller_scope(uuid,uuid,boolean) TO authenticated;
