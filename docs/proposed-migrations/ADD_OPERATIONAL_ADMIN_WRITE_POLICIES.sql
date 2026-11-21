-- PROPOSTA — não executar sem aprovação específica.
-- Destino autorizado: Supabase DEV qwvbvqlzcyfkuszxrlgv.
-- Mantém o desenho atual: somente administradores escrevem dados operacionais;
-- leitura continua sob as policies de módulo já existentes.
BEGIN;

DO $migration$
DECLARE table_name text;
DECLARE tables text[] := ARRAY[
  'coordinators', 'leaders', 'crm_contacts', 'goals',
  'campaign_events', 'meetings', 'field_presences',
  'materials_inventory', 'material_distributions', 'car_stickers',
  'house_stickers', 'popular_demands'
];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'Tabela operacional ausente: public.%', table_name;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_admin', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_admin', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_admin', table_name);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
       WITH CHECK (organization_id = (SELECT private.nexus_auth_org_id())
                   AND (SELECT private.nexus_is_admin()))',
      table_name || '_insert_admin', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
       USING (organization_id = (SELECT private.nexus_auth_org_id())
              AND (SELECT private.nexus_is_admin()))
       WITH CHECK (organization_id = (SELECT private.nexus_auth_org_id())
                   AND (SELECT private.nexus_is_admin()))',
      table_name || '_update_admin', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
       USING (organization_id = (SELECT private.nexus_auth_org_id())
              AND (SELECT private.nexus_is_admin()))',
      table_name || '_delete_admin', table_name);
  END LOOP;
END $migration$;

COMMIT;

-- Verificação posterior (somente leitura):
-- SELECT tablename, cmd, policyname FROM pg_policies
-- WHERE schemaname='public' AND tablename IN (
--   'coordinators','leaders','crm_contacts','goals','campaign_events','meetings',
--   'field_presences','materials_inventory','material_distributions','car_stickers',
--   'house_stickers','popular_demands'
-- ) ORDER BY tablename, cmd, policyname;
