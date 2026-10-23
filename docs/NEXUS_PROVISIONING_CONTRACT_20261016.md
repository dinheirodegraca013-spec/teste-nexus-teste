# NEXUS — Contrato de provisionamento e isolamento

> **Nota de escopo:** contrato histórico. O Supabase DEV atualmente autorizado é `qwvbvqlzcyfkuszxrlgv`; o destino antigo abaixo serve apenas como evidência histórica.

Destino: Supabase `qidstqsbxwkbkwowhpab`. Estado: NÃO HOMOLOGADO.

## Falha reproduzida por inspeção
`src/contexts/AuthContext.tsx` invoca `supabase.rpc('provision_new_user', {p_org_name,p_org_slug,p_campaign_type,p_profile_name})` quando um usuário autenticado não possui perfil. Consulta de `pg_proc` ao novo banco confirmou que **a função não existe**. Logo, o fluxo de primeiro acesso não está pronto.

## Requisitos de segurança da implementação
- A função deve exigir `auth.uid()` válido e usuário autenticado, não aceitar `user_id`, `role` nem `organization_id` do cliente.
- Deve impedir que uma conta já provisionada crie nova organização por repetição da chamada; transação atômica, tratamento de concorrência e slug exclusivo.
- Deve criar somente a organização do próprio usuário e seu perfil inicial com papel definido explicitamente pela regra de negócio, sem conceder papel global `superadmin`.
- Usuários convidados nunca devem acionar provisionamento de novo tenant; metadados editáveis pelo usuário não podem servir como autorização.
- Auditoria e testes de RLS devem comprovar que usuário de outro tenant não lê nem altera perfis, permissões ou registros.
- Evitar função `SECURITY DEFINER` exposta sem controles; se indispensável, revisar proprietário, `search_path`, grants e acesso apenas ao chamador autenticado.
- Validar repetição da chamada, concorrência, erro de slug, login inicial, confirmação de email, convites e retorno ao frontend.

## Estado atual
- `organizations`, `profiles`, `user_module_permissions` implantadas e com RLS.
- `provision_new_user` ausente; cadastro de primeiro usuário BLOQUEADO.
- Tabelas operacionais e E2E ainda pendentes.
- Não tocar no PGE-SAAS `fbvcapoydkodpifkwjwg` nem no projeto histórico `wrovgjhpyacmmetejiqk`.

## Próximo ciclo
Desenhar implementação segura do provisionamento com testes de autorização e revisar o fluxo de convites antes de implantar a RPC.
