-- Automatically provision invited coordinator/leader ONLY when an administrator
-- already created an active team record with the SAME verified auth email.
-- No user-supplied tenant, role, or metadata is trusted.
CREATE OR REPLACE FUNCTION public.nexus_claim_preapproved_team_membership()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_email text;
  v_matches integer;
  v_candidate record;
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;
  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users u
  WHERE u.id=v_user AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL OR v_email='' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user) THEN RETURN true; END IF;

  -- Do not allow a confirmed email that occurs in several team records
  -- to choose its tenant arbitrarily.
  SELECT count(*) INTO v_matches FROM (
    SELECT c.id FROM public.coordinators c
      WHERE lower(trim(c.email))=v_email AND c.status='active'
    UNION ALL
    SELECT l.id FROM public.leaders l
      WHERE lower(trim(l.email))=v_email AND l.status='active'
  ) candidates;
  IF v_matches <> 1 THEN RETURN false; END IF;

  SELECT kind,id,organization_id,name INTO v_candidate FROM (
    SELECT 'coordinator'::text AS kind,c.id,c.organization_id,c.name
      FROM public.coordinators c
      WHERE lower(trim(c.email))=v_email AND c.status='active'
    UNION ALL
    SELECT 'leader'::text AS kind,l.id,l.organization_id,l.name
      FROM public.leaders l
      WHERE lower(trim(l.email))=v_email AND l.status='active'
  ) candidates LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id=v_candidate.organization_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles a
    WHERE a.organization_id=v_candidate.organization_id
      AND a.role='admin' AND a.is_blocked=false
  ) THEN RETURN false; END IF;

  INSERT INTO public.profiles (id,organization_id,name,email,role,is_blocked)
  VALUES (v_user,v_candidate.organization_id,v_candidate.name,v_email,v_candidate.kind,false)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=v_user AND p.organization_id=v_candidate.organization_id
      AND p.role=v_candidate.kind AND p.is_blocked=false
  ) THEN RETURN false; END IF;

  INSERT INTO private.nexus_team_memberships
    (user_id,organization_id,coordinator_id,leader_id)
  VALUES (
    v_user,v_candidate.organization_id,
    CASE WHEN v_candidate.kind='coordinator' THEN v_candidate.id ELSE NULL END,
    CASE WHEN v_candidate.kind='leader' THEN v_candidate.id ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.audit_logs(organization_id,user_id,action,entity,entity_id,details)
  VALUES (v_candidate.organization_id,v_user,'auto_claim_preapproved_team','profile',v_user,
    jsonb_build_object('role',v_candidate.kind,'verified_email',true));

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.nexus_claim_preapproved_team_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nexus_claim_preapproved_team_membership() TO authenticated;
