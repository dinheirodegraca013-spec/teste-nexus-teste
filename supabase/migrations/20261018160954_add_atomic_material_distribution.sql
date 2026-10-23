-- Applied in Supabase DEV qwvbvqlzcyfkuszxrlgv.
BEGIN;

CREATE OR REPLACE FUNCTION public.nexus_distribute_material(
  p_material_id uuid,
  p_recipient_name text,
  p_territory text,
  p_quantity integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_org uuid := (SELECT private.nexus_auth_org_id());
  v_material public.materials_inventory%ROWTYPE;
  v_distribution_id uuid;
BEGIN
  IF v_org IS NULL OR NOT (SELECT private.nexus_is_admin()) THEN
    RAISE EXCEPTION 'Only active tenant admins may distribute materials' USING ERRCODE='42501';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Distribution quantity must be greater than zero' USING ERRCODE='22023';
  END IF;
  IF nullif(trim(coalesce(p_recipient_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Recipient name is required' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_material
  FROM public.materials_inventory
  WHERE id = p_material_id AND organization_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material not found in the authenticated tenant' USING ERRCODE='42501';
  END IF;
  IF p_quantity > (v_material.total_quantity - v_material.distributed_quantity) THEN
    RAISE EXCEPTION 'Insufficient material stock' USING ERRCODE='22003';
  END IF;

  INSERT INTO public.material_distributions(
    organization_id, material_id, material_name, recipient_name,
    territory, quantity, status, distributed_at, distributed_by
  ) VALUES (
    v_org, v_material.id, coalesce(v_material.name, v_material.item_name, ''),
    trim(p_recipient_name), coalesce(p_territory, ''), p_quantity,
    'delivered', now(), (SELECT auth.uid())::text
  ) RETURNING id INTO v_distribution_id;

  UPDATE public.materials_inventory
  SET distributed_quantity = distributed_quantity + p_quantity,
      updated_at = now()
  WHERE id = v_material.id AND organization_id = v_org;

  RETURN v_distribution_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.nexus_distribute_material(uuid,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nexus_distribute_material(uuid,text,text,integer) TO authenticated;

COMMIT;
