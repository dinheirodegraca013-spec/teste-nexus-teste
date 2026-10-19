-- NEXUS DEV only: reconciliation of an already verified RPC.
-- Apply only after explicit approval; this file is not executed by this cycle.
BEGIN;

CREATE OR REPLACE FUNCTION public.nexus_increment_goal(
  p_goal_id uuid,
  p_amount integer
) RETURNS public.goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_org uuid := (SELECT private.nexus_auth_org_id());
  v_goal public.goals;
BEGIN
  IF v_org IS NULL OR NOT (SELECT private.nexus_is_admin()) THEN
    RAISE EXCEPTION 'Only active tenant admins may increment goals' USING ERRCODE = '42501';
  END IF;
  IF p_goal_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Goal and increment must be valid and positive' USING ERRCODE = '22023';
  END IF;

  UPDATE public.goals
  SET current_value = current_value + p_amount,
      status = CASE WHEN current_value + p_amount >= target_value THEN 'completed' ELSE status END
  WHERE id = p_goal_id AND organization_id = v_org
  RETURNING * INTO v_goal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found in the authenticated tenant' USING ERRCODE = '42501';
  END IF;
  RETURN v_goal;
END
$fn$;

REVOKE ALL ON FUNCTION public.nexus_increment_goal(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nexus_increment_goal(uuid, integer) TO authenticated, service_role;

COMMIT;
