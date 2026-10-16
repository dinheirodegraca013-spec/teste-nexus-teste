# NEXUS — Novo banco: compatibilidade de migrations

Data: 2026-10-16
Destino EXCLUSIVO: qidstqsbxwkbkwowhpab
Estado: EM DESENVOLVIMENTO — NÃO HOMOLOGADO

## Evidências verificadas
- Novo banco contém organizations, profiles, user_module_permissions com RLS ativada.
- As migrations existentes em `supabase/migrations/20261016010000_harden_profiles_rls_superadmin.sql` e `20261016011000_scope_rbac_permissions_to_tenant.sql` referenciam `private.get_auth_org_id()`, mas a base recém-criada usa `private.nexus_auth_org_id()`. NÃO aplicar as migrations antigas sem adaptar e revisar.
- Os serviços do frontend exigem tabelas operacionais adicionais, ainda não verificadas como implantadas.
- A tentativa de aplicar a migration operacional em 2026-10-16 foi bloqueada pela ferramenta de segurança; não alegar implantação.
- O projeto histórico wrovgjhpyacmmetejiqk e PGE-SAAS fbvcapoydkodpifkwjwg são intocáveis.

## Riscos a resolver antes de homologar
1. Provisionamento confiável do primeiro administrador e associação auth.users/profiles, sem autoelevação.
2. `profilesService.update()` aceita `role` e `organization_id`; o servidor precisa impedir mudanças indevidas.
3. `crmService.update()` aceita `organization_id`; validar imutabilidade do tenant e chaves estrangeiras entre tabelas da mesma organização.
4. O frontend usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; verificar configuração do preview antes de redeploy.
5. Testes reais com dois tenants, usuário sem permissão e operações CRUD, além de logs de navegador.
6. Comparar todas as colunas físicas com `src/services/coreServices.ts`, `src/services/dataServices.ts` e `src/types/index.ts`.

## Próximo passo
Revisar e versionar uma migration operacional mínima, executar por um caminho autorizado, validar RLS e API, depois avançar nos módulos. Não executar SQL destrutivo nem mesclar PR sem homologação.
