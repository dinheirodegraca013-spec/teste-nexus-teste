-- PROPOSTA PARA REVISAO. NAO APLICADA.
-- Destino exclusivo: qidstqsbxwkbkwowhpab.
-- Requer aprovacao especifica, backup e testes em ambiente controlado.
BEGIN;

CREATE FUNCTION public.provision_new_user(
  p_org_name text,
  p_org_slug text,
  p_campaign_type text,
  p_profile_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_invited timestamptz;
  v_confirmed timestamptz;
  v_org uuid;
  v_blocked boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- The server-owned Auth row serializes provisioning for this identity.
  SELECT email, invited_at, email_confirmed_at
    INTO v_email, v_invited, v_confirmed
    FROM auth.users WHERE id = v_user FOR UPDATE;
  IF NOT FOUND OR v_confirmed IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'Confirmed email identity required' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id, is_blocked INTO v_org, v_blocked
    FROM public.profiles WHERE id = v_user;
  IF FOUND THEN
    IF v_blocked THEN
      RAISE EXCEPTION 'Account blocked' USING ERRCODE = '42501';
    END IF;
    RETURN v_org;
  END IF;
  IF v_invited IS NOT NULL THEN
    RAISE EXCEPTION 'Invited account requires administrator provisioning'
      USING ERRCODE = '42501';
  END IF;

  IF p_org_name IS NULL OR length(btrim(p_org_name)) NOT BETWEEN 1 AND 120
     OR p_profile_name IS NULL OR length(btrim(p_profile_name)) NOT BETWEEN 1 AND 120
     OR p_org_slug IS NULL OR p_org_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$'
     OR p_campaign_type IS DISTINCT FROM 'DEPUTADO_FEDERAL' THEN
    RAISE EXCEPTION 'Invalid provisioning input' USING ERRCODE = '22023';
  END IF;

  -- UUID suffix avoids competing names/slugs across different identities.
  v_org := gen_random_uuid();
  INSERT INTO public.organizations(id, name, slug, campaign_type)
    VALUES (v_org, btrim(p_org_name), p_org_slug || '-' || v_org::text, p_campaign_type);
  INSERT INTO public.profiles(id, organization_id, name, email, role, is_blocked)
    VALUES (v_user, v_org, btrim(p_profile_name), v_email, 'admin', false);
  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_new_user(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_new_user(text,text,text,text) TO authenticated;
COMMIT;

-- Rollback de codigo (executar somente mediante aprovacao):
-- DROP FUNCTION public.provision_new_user(text,text,text,text);
-- Nao apagar organizacoes, perfis ou identidades criados.
