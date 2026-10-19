# NEXUS — Auditoria técnica (2026-10-16)

> **Nota de escopo:** auditoria histórica. O Supabase DEV atualmente autorizado é `qwvbvqlzcyfkuszxrlgv`; o identificador antigo abaixo não é perímetro operacional.

**Estado:** REPROVADO PARA HOMOLOGAÇÃO. Auditoria estática e consultas read-only; testes autenticados E2E não executados. Nenhum merge, deploy de produção ou mudança no banco foi realizado nesta auditoria.

## Fontes verificadas
- GitHub `dinheirodegraca013-spec/teste-nexus-teste`, branch `fix/persist-rbac-permissions`, HEAD anterior à auditoria `798ab49`, PR #1 draft.
- Supabase **exclusivamente** `qidstqsbxwkbkwowhpab` (desenvolvimento): pg_policies, grants, functions, foreign keys, migrations, Storage, Edge Functions e advisors.
- Vercel `prj_d1Xv2bMB8u5Iaztw2KhhMjZxgVnd`: preview READY para `798ab49`; não comprova testes autenticados.
- GitHub Actions ciclo #7 `38957999892`: sucesso com Codex, TypeScript/build, Deno e commit. CI posterior `38958317180` apresentou `action_required`, não sucesso.
- Skills usadas: Supabase e Supabase Postgres Best Practices. Referência: documentação Supabase RLS, grants, security definer e testes pgTAP.

## Bloqueadores críticos / altos

1. **CRÍTICO — privilégios SQL excessivos:** `authenticated` tem `TRUNCATE` em `public.organizations`, `public.profiles`, `public.user_module_permissions`, além de INSERT/UPDATE/DELETE/TRIGGER/REFERENCES. RLS não protege TRUNCATE. Elaborar migração idempotente de REVOKE mínimo, verificar com `has_table_privilege`, e testar cliente autenticado; nunca aplicar sem revisão e rollback.
2. **ALTO — hierarquia RLS insuficiente:** 13 tabelas operacionais têm SELECT por `organization_id`, sem restrições de líder/controlador/coordenador. Usuários autenticados da mesma organização podem consultar registros de equipes alheias quando têm grant. Implementar hierarquia servidor e testes negativos por papel, sem confiar em filtro frontend.
3. **ALTO — escrita operacional indisponível para papéis previstos:** INSERT/UPDATE/DELETE das 12 tabelas operacionais de negócios requerem `private.nexus_is_admin()`. Coordenadores e lideranças não conseguem registrar CRM, adesivagens, presenças etc. Reprojetar policies por operação/papel e vínculo territorial; testar com usuários reais em tenant de teste.
4. **ALTO — perfis não atualizáveis via frontend:** `public.profiles` tem somente policy SELECT, nenhuma UPDATE. `profilesService.update`, `updateProfile` e `switchOrganization` dependem de UPDATE. Não habilitar UPDATE genérico: impedir elevação de role, transferência de tenant e alteração de email por campo livre; criar RPC administrativa limitada e atualização de campos pessoais autorizados.
5. **ALTO — inconsistência de migrações:** DB lista 5 migrações `20261016152053`, `20261016153154`, `20261016175917`, `20261016182406`, `20261016182434`; GitHub branch contém apenas `20261016010000_harden_profiles_rls_superadmin.sql` e `20261016011000_scope_rbac_permissions_to_tenant.sql`, com funções `private.get_auth_org_id` e referência explícita ao Supabase antigo. Não aplicar as migrações antigas no novo projeto. Versionar schema REAL em arquivos novos, reconciliar histórico e testar banco limpo.
6. **ALTO — Storage não preparado:** `storage.buckets` vazio; uploads de fotos exigidos para presenças, adesivagem e comprovações não estão homologados. Criar buckets privados com caminhos por tenant e políticas CRUD testadas; evitar URLs públicas com dados pessoais.
7. **ALTO — Edge Function ausente:** projeto novo não tem funções implantadas. `coreServices.ts` chama `invite-organization-member`, existente como código no GitHub, não no destino. Convites reais não podem ser considerados funcionando.
8. **ALTO — RBAC do frontend divergente:** `checkUserPermission` concede todas as ações de CRM/field/stickers ao líder e muitas ao coordenador, ignorando `user_module_permissions`. `UserRole` não contempla `controller`, profissional de saúde, nem módulos de projetos, financeiro e jurídico definidos no escopo. A proteção da UI não substitui autorização DB.
9. **ALTO — SECURITY DEFINER exposta:** `public.provision_new_user(text,text,text,text)` é executável por `authenticated`. Corpo foi inspecionado: verifica `auth.uid()`, email confirmado, convite, perfil existente e valida entradas; portanto é alerta de superfície privilegiada, **não prova de exploração**. Reavaliar contrato e testar abuso/race conditions antes de alterar.
10. **MÉDIO — proteção contra senhas vazadas desativada:** aviso do Supabase Auth Security Advisor.
11. **MÉDIO — CI posterior ao commit autônomo:** GitHub Actions `38958317180` terminou `action_required`; workflow autônomo `38957999892` passou. Investigar diferença de gatilhos/permissões, não tratar todos os checks como aprovados.
12. **MÉDIO — testes insuficientes:** existem `tests/auth-permissions.test.mjs` e `tests/auth-profile-loading.test.mjs`, mas não há evidência de suíte real de RLS com 2 organizações e múltiplos usuários, testes Storage, convite, sessão e CRUD E2E.
13. **BAIXO — 17 índices não utilizados:** advisor de performance; tabelas estão praticamente vazias, portanto NÃO remover índices apenas por esse aviso.

## Cobertura por área
- Autenticação: **PARCIAL** (correções e testes unitários; fluxos reais não homologados).
- Multi-tenant: **PARCIAL** (16/16 tabelas RLS; isolamento de organização por policy; privilégios excessivos e testes cruzados faltando).
- RBAC/hierarquia: **REPROVADO** (divergência frontend/DB, papéis e módulos ausentes).
- CRM, líderes, coordenadores, metas, presenças, adesivagens, materiais, eventos, reuniões, demandas: **ESQUEMA PRESENTE, FLUXO NÃO HOMOLOGADO**.
- Storage de fotos: **NÃO CONFIGURADO**.
- Convites Edge Function: **NÃO IMPLANTADO NO DESTINO**.
- Inteligência territorial/relatórios: **INTERFACE IDENTIFICADA, E2E NÃO VERIFICADO**.
- Projetos, profissional de saúde, jurídico, financeiro e controlador: **LACUNAS DE ESCOPO** na tipagem/rotas inspecionadas.
- Vercel preview: **READY**, sem garantia de integração Supabase/variáveis corretas ou teste de navegador.
- Logs: fontes `pgbouncer_logs`, `edge_logs`, `postgres_logs`, `postgrest_logs`, `auth_logs`, `storage_logs` disponíveis; contagens não comprovam ausência de erros.

## Plano de correção e validação (sem tocar produção)
1. Revisar e versionar REVOKE dos privilégios excessivos; rodar `has_table_privilege` e teste de negação real.
2. Criar matriz papel × módulo × ação × hierarquia, incluindo Controlador e Profissional; alinhar UI, rota, serviço e RLS.
3. Reconciliar migrações e montar banco de teste reproduzível; testes pgTAP allow/deny para dois tenants.
4. Corrigir UPDATE de perfis por operações específicas sem escalada de privilégios.
5. Criar Storage privado e implantar função de convites no novo projeto, com testes autenticados.
6. Validar módulo por módulo com usuário administrador, coordenador, controlador, líder, profissional e usuário bloqueado; testar CRUD, fotos, geolocalização, privacidade, LGPD e auditoria.
7. Corrigir CI `action_required`, confirmar preview e executar E2E de navegador.
8. Homologar somente depois de testes negativos de acesso, segurança, backup/rollback e aceite explícito.

**Restrição:** não tocar nos projetos Supabase antigos `wrovgjhpyacmmetejiqk`, `qesiqjcpphkwryjvpzmq`, nem no Gestio. Não fazer merge ou deploy de produção sem aprovação. Não criar dados fictícios na produção.
