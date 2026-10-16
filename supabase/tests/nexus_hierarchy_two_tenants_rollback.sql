-- DEV ONLY qidstqsbxwkbkwowhpab. Transactional synthetic RLS check.
-- Never run in production. No emails are sent. Transaction ALWAYS rolls back.
BEGIN;
INSERT INTO public.organizations(id,name,slug,campaign_type) VALUES
 ('10000000-0000-4000-8000-000000000001','Synthetic Org A','synthetic-a-rls','DEPUTADO_FEDERAL'),
 ('10000000-0000-4000-8000-000000000002','Synthetic Org B','synthetic-b-rls','DEPUTADO_FEDERAL');

INSERT INTO auth.users(id,email,aud,role) VALUES
 ('10000000-0000-4000-8000-000000000011','synthetic-admin-a@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000012','synthetic-leader-a@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000013','synthetic-coordinator-a@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000014','synthetic-controller-a@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000015','synthetic-viewer-a@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000016','synthetic-leader-b@example.invalid','authenticated','authenticated');

INSERT INTO public.profiles(id,organization_id,name,email,role) VALUES
 ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','Admin A','synthetic-admin-a@example.invalid','admin'),
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Leader A','synthetic-leader-a@example.invalid','leader'),
 ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','Coord A','synthetic-coordinator-a@example.invalid','coordinator'),
 ('10000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','Controller A','synthetic-controller-a@example.invalid','controller'),
 ('10000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','Viewer A','synthetic-viewer-a@example.invalid','viewer'),
 ('10000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000002','Leader B','synthetic-leader-b@example.invalid','leader');

INSERT INTO public.coordinators(id,organization_id,name,territory) VALUES
 ('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000001','Territory A','A'),
 ('10000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','Territory B','B');
INSERT INTO public.leaders(id,organization_id,name,territory,coordinator_id) VALUES
 ('10000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000001','Synthetic Leader A','A','10000000-0000-4000-8000-000000000021'),
 ('10000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000002','Synthetic Leader B','B','10000000-0000-4000-8000-000000000022');

INSERT INTO private.nexus_team_memberships(user_id,organization_id,leader_id,coordinator_id) VALUES
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031',NULL),
 ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001',NULL,'10000000-0000-4000-8000-000000000021'),
 ('10000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032',NULL);
INSERT INTO private.nexus_controller_scopes(organization_id,controller_user_id,coordinator_id)
VALUES ('10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000014',
        '10000000-0000-4000-8000-000000000021');

INSERT INTO public.crm_contacts(organization_id,leader_id,name) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031','Contact A'),
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032','Contact B');
INSERT INTO public.field_presences(organization_id,leader_id) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031'),
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032');

SET LOCAL ROLE authenticated;
DO $test$
DECLARE n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 1 THEN RAISE EXCEPTION 'Admin A leaders should be 1, got %',n; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 1 THEN RAISE EXCEPTION 'Admin A CRM should be 1, got %',n; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 1 THEN RAISE EXCEPTION 'Leader A leaders should be 1, got %',n; END IF;
  SELECT count(*) INTO n FROM public.coordinators;
  IF n <> 0 THEN RAISE EXCEPTION 'Leader A must not list coordinators'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 1 THEN RAISE EXCEPTION 'Leader A CRM should be 1, got %',n; END IF;
  SELECT count(*) INTO n FROM public.field_presences;
  IF n <> 1 THEN RAISE EXCEPTION 'Leader A presences should be 1, got %',n; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000013',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 1 THEN RAISE EXCEPTION 'Coordinator A leaders should be 1, got %',n; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000014',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 1 THEN RAISE EXCEPTION 'Controller A leaders should be 1, got %',n; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000015',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 0 THEN RAISE EXCEPTION 'Viewer A should have no leaders'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Viewer A should have no CRM'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000016',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 1 THEN RAISE EXCEPTION 'Leader B leaders should be 1, got %',n; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 1 THEN RAISE EXCEPTION 'Leader B CRM should be 1, got %',n; END IF;
  RAISE NOTICE 'PASS: isolated leaders, coordinator, controller, CRM and presence across two tenants';
END
$test$;
RESET ROLE;
ROLLBACK;
