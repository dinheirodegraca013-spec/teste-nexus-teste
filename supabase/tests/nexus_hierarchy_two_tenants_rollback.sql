-- DEV ONLY qwvbvqlzcyfkuszxrlgv. Transactional synthetic RLS check.
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
 ('10000000-0000-4000-8000-000000000016','synthetic-leader-b@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000017','synthetic-no-grant@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000018','synthetic-revoked-crm@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000019','synthetic-blocked-admin@example.invalid','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000020','synthetic-blocked-leader@example.invalid','authenticated','authenticated');

INSERT INTO public.profiles(id,organization_id,name,email,role) VALUES
 ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','Admin A','synthetic-admin-a@example.invalid','admin'),
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Leader A','synthetic-leader-a@example.invalid','leader'),
 ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','Coord A','synthetic-coordinator-a@example.invalid','coordinator'),
 ('10000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','Controller A','synthetic-controller-a@example.invalid','controller'),
 ('10000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000001','Viewer A','synthetic-viewer-a@example.invalid','viewer'),
 ('10000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000002','Leader B','synthetic-leader-b@example.invalid','leader'),
 ('10000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000001','Leader No Grant','synthetic-no-grant@example.invalid','leader'),
 ('10000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000001','Leader Revoked CRM','synthetic-revoked-crm@example.invalid','leader');

INSERT INTO public.profiles(id,organization_id,name,email,role,is_blocked) VALUES
 ('10000000-0000-4000-8000-000000000019','10000000-0000-4000-8000-000000000001','Blocked Admin','synthetic-blocked-admin@example.invalid','admin',true),
 ('10000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','Blocked Leader','synthetic-blocked-leader@example.invalid','leader',true);

-- The current read policies require both hierarchical scope and module access.
-- Viewer A and Leader No Grant intentionally receive no grants.
INSERT INTO public.user_module_permissions(user_id,module_key,can_read) VALUES
 ('10000000-0000-4000-8000-000000000012','leaders',true),
 ('10000000-0000-4000-8000-000000000012','crm',true),
 ('10000000-0000-4000-8000-000000000012','presence',true),
 ('10000000-0000-4000-8000-000000000013','leaders',true),
 ('10000000-0000-4000-8000-000000000014','leaders',true),
 ('10000000-0000-4000-8000-000000000016','leaders',true),
 ('10000000-0000-4000-8000-000000000016','crm',true),
 ('10000000-0000-4000-8000-000000000018','leaders',true),
 ('10000000-0000-4000-8000-000000000018','crm',false),
 ('10000000-0000-4000-8000-000000000020','leaders',true),
 ('10000000-0000-4000-8000-000000000020','crm',true);

INSERT INTO public.coordinators(id,organization_id,name,territory) VALUES
 ('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000001','Territory A','A'),
 ('10000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','Territory B','B'),
 ('10000000-0000-4000-8000-000000000023','10000000-0000-4000-8000-000000000001','Other Territory A','A2');
INSERT INTO public.leaders(id,organization_id,name,territory,coordinator_id) VALUES
 ('10000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000001','Synthetic Leader A','A','10000000-0000-4000-8000-000000000021'),
 ('10000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000002','Synthetic Leader B','B','10000000-0000-4000-8000-000000000022'),
 ('10000000-0000-4000-8000-000000000033','10000000-0000-4000-8000-000000000001','Other Leader A','A2','10000000-0000-4000-8000-000000000023');

INSERT INTO private.nexus_team_memberships(user_id,organization_id,leader_id,coordinator_id) VALUES
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031',NULL),
 ('10000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001',NULL,'10000000-0000-4000-8000-000000000021'),
 ('10000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032',NULL),
 ('10000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031',NULL),
 ('10000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031',NULL),
 ('10000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031',NULL);
INSERT INTO private.nexus_controller_scopes(organization_id,controller_user_id,coordinator_id)
VALUES ('10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000014',
        '10000000-0000-4000-8000-000000000021');

INSERT INTO public.crm_contacts(organization_id,leader_id,name) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031','Contact A'),
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032','Contact B'),
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000033','Other Contact A');
INSERT INTO public.field_presences(organization_id,leader_id) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031'),
 ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000032');

SET LOCAL ROLE authenticated;
DO $test$
DECLARE n integer; expected_rows integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
  SELECT count(*), count(*) FILTER (WHERE id IN ('10000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000033') AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.leaders;
  IF n <> 2 OR expected_rows <> 2 THEN RAISE EXCEPTION 'Admin A leaders must contain both leaders in organization A only'; END IF;
  SELECT count(*), count(*) FILTER (WHERE leader_id IN ('10000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000033') AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.crm_contacts;
  IF n <> 2 OR expected_rows <> 2 THEN RAISE EXCEPTION 'Admin A CRM must contain both contacts in organization A only'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
  SELECT count(*), count(*) FILTER (WHERE id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.leaders;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader A must see only leader A'; END IF;
  SELECT count(*) INTO n FROM public.coordinators;
  IF n <> 0 THEN RAISE EXCEPTION 'Leader A must not list coordinators'; END IF;
  SELECT count(*), count(*) FILTER (WHERE leader_id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.crm_contacts;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader A CRM must contain only contact A'; END IF;
  SELECT count(*), count(*) FILTER (WHERE leader_id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.field_presences;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader A presences must contain only presence A'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000013',true);
  SELECT count(*), count(*) FILTER (WHERE id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.leaders;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Coordinator A must see only leader A'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000014',true);
  SELECT count(*), count(*) FILTER (WHERE id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.leaders;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Controller A must see only leader A'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000015',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 0 THEN RAISE EXCEPTION 'Viewer A should have no leaders'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Viewer A should have no CRM'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000017',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 0 THEN RAISE EXCEPTION 'Scoped leader without grants must not read leaders'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Scoped leader without grants must not read CRM'; END IF;
  SELECT count(*) INTO n FROM public.field_presences;
  IF n <> 0 THEN RAISE EXCEPTION 'Scoped leader without grants must not read presence'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000018',true);
  SELECT count(*), count(*) FILTER (WHERE id='10000000-0000-4000-8000-000000000031' AND organization_id='10000000-0000-4000-8000-000000000001') INTO n, expected_rows FROM public.leaders;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader with grant must see their own scoped leader'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Scoped leader with revoked CRM grant must not read CRM'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000019',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 0 THEN RAISE EXCEPTION 'Blocked admin must not read leaders'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Blocked admin must not read CRM'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000020',true);
  SELECT count(*) INTO n FROM public.leaders;
  IF n <> 0 THEN RAISE EXCEPTION 'Blocked leader must not read leaders despite grant'; END IF;
  SELECT count(*) INTO n FROM public.crm_contacts;
  IF n <> 0 THEN RAISE EXCEPTION 'Blocked leader must not read CRM despite grant'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000016',true);
  SELECT count(*), count(*) FILTER (WHERE id='10000000-0000-4000-8000-000000000032' AND organization_id='10000000-0000-4000-8000-000000000002') INTO n, expected_rows FROM public.leaders;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader B must see only leader B'; END IF;
  SELECT count(*), count(*) FILTER (WHERE leader_id='10000000-0000-4000-8000-000000000032' AND organization_id='10000000-0000-4000-8000-000000000002') INTO n, expected_rows FROM public.crm_contacts;
  IF n <> 1 OR expected_rows <> 1 THEN RAISE EXCEPTION 'Leader B CRM must contain only contact B'; END IF;
  RAISE NOTICE 'PASS: isolated leaders, coordinator, controller, CRM and presence across two tenants';
END
$test$;
-- Exercise real authenticated writes against synthetic rows only. All writes roll back.
DO $write_test$
DECLARE affected integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
  UPDATE public.leaders SET name='Updated own tenant'
    WHERE id='10000000-0000-4000-8000-000000000031';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin own-tenant update must affect one row'; END IF;

  UPDATE public.leaders SET name='Forbidden cross-tenant update'
    WHERE id='10000000-0000-4000-8000-000000000032';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Admin cross-tenant update was permitted'; END IF;

  INSERT INTO public.leaders(id,organization_id,name,territory) VALUES
    ('10000000-0000-4000-8000-000000000034','10000000-0000-4000-8000-000000000001','Inserted own tenant','A');
  BEGIN
    INSERT INTO public.leaders(id,organization_id,name,territory) VALUES
      ('10000000-0000-4000-8000-000000000035','10000000-0000-4000-8000-000000000002','Forbidden cross tenant','B');
    RAISE EXCEPTION 'Admin cross-tenant insert was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
  UPDATE public.leaders SET name='Forbidden leader update'
    WHERE id='10000000-0000-4000-8000-000000000031';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Non-admin leader update was permitted'; END IF;
  BEGIN
    INSERT INTO public.leaders(id,organization_id,name,territory) VALUES
      ('10000000-0000-4000-8000-000000000036','10000000-0000-4000-8000-000000000001','Forbidden leader insert','A');
    RAISE EXCEPTION 'Non-admin leader insert was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.profiles SET name='Updated own synthetic profile'
    WHERE id='10000000-0000-4000-8000-000000000012';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Own profile name update must affect one row'; END IF;
  UPDATE public.profiles SET name='Forbidden other profile update'
    WHERE id='10000000-0000-4000-8000-000000000013';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Another profile update was permitted'; END IF;
  BEGIN
    UPDATE public.profiles SET role='admin'
      WHERE id='10000000-0000-4000-8000-000000000012';
    RAISE EXCEPTION 'Self-promotion was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000019',true);
  UPDATE public.leaders SET name='Forbidden blocked admin update'
    WHERE id='10000000-0000-4000-8000-000000000031';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Blocked admin update was permitted'; END IF;
  BEGIN
    INSERT INTO public.leaders(id,organization_id,name,territory) VALUES
      ('10000000-0000-4000-8000-000000000037','10000000-0000-4000-8000-000000000001','Forbidden blocked admin insert','A');
    RAISE EXCEPTION 'Blocked admin insert was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $write_test$;
-- RPC adversarial checks under actual authenticated database role.
DO $rpc_test$
BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
  PERFORM public.nexus_set_team_scope(
    '10000000-0000-4000-8000-000000000012',NULL,
    '10000000-0000-4000-8000-000000000031');
  PERFORM public.nexus_set_controller_scope(
    '10000000-0000-4000-8000-000000000014',
    '10000000-0000-4000-8000-000000000021',true);
  BEGIN
    PERFORM public.nexus_set_team_scope(
      '10000000-0000-4000-8000-000000000016',NULL,
      '10000000-0000-4000-8000-000000000032');
    RAISE EXCEPTION 'Cross-tenant team assignment incorrectly permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.nexus_set_controller_scope(
      '10000000-0000-4000-8000-000000000014',
      '10000000-0000-4000-8000-000000000022',true);
    RAISE EXCEPTION 'Cross-tenant controller scope incorrectly permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.nexus_set_team_scope(
      '10000000-0000-4000-8000-000000000014',NULL,
      '10000000-0000-4000-8000-000000000031');
    RAISE EXCEPTION 'Controller incorrectly assigned as leader';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000014',true);
  BEGIN
    PERFORM public.nexus_set_team_scope(
      '10000000-0000-4000-8000-000000000012',NULL,
      '10000000-0000-4000-8000-000000000031');
    RAISE EXCEPTION 'Non-admin wrongly assigned team membership';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS: admin RPC allows own tenant, denies cross-tenant and non-admin calls';
END $rpc_test$;
RESET ROLE;
ROLLBACK;
