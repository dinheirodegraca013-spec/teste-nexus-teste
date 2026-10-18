-- PROPOSTA — não executar sem aprovação específica.
-- Destino autorizado: Supabase DEV qwvbvqlzcyfkuszxrlgv.
-- Permite apenas administradores da própria organização atualizarem campos
-- já filtrados pelo serviço (name/settings). Não altera produção.

DROP POLICY IF EXISTS organizations_update ON public.organizations;

CREATE POLICY organizations_update
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT private.nexus_auth_org_id())
    AND (SELECT private.nexus_is_admin())
  )
  WITH CHECK (
    id = (SELECT private.nexus_auth_org_id())
    AND (SELECT private.nexus_is_admin())
  );
