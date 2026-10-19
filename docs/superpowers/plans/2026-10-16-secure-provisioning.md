# Provisionamento seguro do NEXUS Implementation Plan

> **Nota de escopo:** plano histórico. O Supabase DEV atualmente autorizado é `qwvbvqlzcyfkuszxrlgv`; referências ao destino antigo não são instruções de execução.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o primeiro cadastro e os convites criarem perfis no tenant correto, sem permitir escalada de privilégio ou acesso cruzado.

**Architecture:** Uma migration versionada cria uma RPC `public.provision_new_user` com privilégios mínimos, autenticação obrigatória e comportamento idempotente. O frontend mantém a chamada atual, mas passa a tratar o resultado tipado e não tenta alterar tenant/papel diretamente. Testes em Preview verificam autenticação, RLS e dois tenants antes de qualquer corte de produção.

**Tech Stack:** React 19, TypeScript, Vite 6, Supabase PostgreSQL 17, Supabase Auth, Deno Edge Functions, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-16-secure-provisioning-design.md`

## Global Constraints

- Destino exclusivo: `qidstqsbxwkbkwowhpab`; nunca alterar `wrovgjhpyacmmetejiqk` ou PGE-SAAS.
- Não aplicar SQL, DDL, GRANT, REVOKE, RLS ou função privilegiada sem apresentar a migration completa e obter aprovação expressa.
- Não trocar variáveis Vercel de Production neste plano.
- Não criar/promover `superadmin`; primeiro perfil é `admin`.
- Não aceitar `user_id`, `organization_id` ou `role` como autoridade enviada pelo cliente.
- O SQL deve usar `SET search_path = ''`, `REVOKE EXECUTE FROM PUBLIC` e concessão restrita a `authenticated`.
- Todo resultado é classificado APROVADO, REPROVADO, NÃO VERIFICADO ou BLOQUEADO.

## Review Focus

- Repetição simultânea do primeiro login deve retornar o mesmo perfil e não criar dois tenants — teste na Task 3.
- Metadados de convite manipulados no cliente não podem criar admin nem tenant — teste na Task 2.
- Falha após criação Auth e antes do perfil deve retornar estado recuperável, sem falso sucesso — teste na Task 3.
- Admin do tenant A não pode administrar perfil/permissão do tenant B — teste na Task 4.
- URL e chave pública Vite precisam pertencer ao mesmo projeto no Preview — verificação da Task 5.

---

### Task 1: Adicionar base de testes do frontend

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Create: `src/contexts/AuthContext.test.ts`

**Interfaces:**
- Consumes: `normalizeRole`, `checkUserPermission` e `getDefaultRouteForUser` exportados por `src/contexts/AuthContext.tsx`.
- Produces: comando `npm test` executável localmente e no CI.

- [ ] **Step 1: Escrever testes para perfil ausente, operador sem permissão e papel normalizado**

Use um perfil de `operator` sem permissões e entradas `ADMIN`, `coordenador` e `liderança`; espere negação padrão e rotas coerentes.

- [ ] **Step 2: Executar o teste para confirmar falha**

Run: `npm test -- --run src/contexts/AuthContext.test.ts`  
Expected: FAIL porque o runner ainda não existe.

- [ ] **Step 3: Adicionar Vitest como dependência de desenvolvimento e script `test`**

Configure o ambiente Node sem DOM para testar as funções puras; não introduza mocks de dados de negócio.

- [ ] **Step 4: Executar teste e validações de build**

Run: `npm test -- --run src/contexts/AuthContext.test.ts && npm run lint && npm run build`  
Expected: PASS.

- [ ] **Step 5: Incluir `npm test -- --run` no job `validate` do CI**

Mantenha os jobs Deno existentes.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock src/contexts/AuthContext.test.ts .github/workflows/ci.yml
git commit -m "test(auth): add permission helper coverage"
```

### Task 2: Preparar migration de provisionamento para revisão humana

**Files:**
- Create: `supabase/migrations/<timestamp>_add_secure_user_provisioning.sql`
- Create: `supabase/tests/provisioning_rls.sql`
- Modify: `docs/NEXUS_PROVISIONING_CONTRACT_20261016.md`

**Interfaces:**
- Consumes: `private.nexus_auth_org_id()`, `private.nexus_is_admin()`, `public.organizations`, `public.profiles`.
- Produces: `public.provision_new_user(p_org_name text, p_org_slug text, p_campaign_type text, p_profile_name text) returns uuid`.

- [ ] **Step 1: Escrever o teste SQL de falha para usuário não autenticado e para papel/tenant fornecidos pelo cliente**

O script deve provar que a RPC exige `auth.uid()` e não possui parâmetros de usuário, papel ou organização.

- [ ] **Step 2: Escrever a migration sem aplicá-la**

A função deve: bloquear chamada sem identidade; retornar organização existente do próprio perfil; recusar conta marcada como convidada por vínculo backend; inserir organização e perfil `admin` numa única transação; lidar com colisão de slug; usar `SECURITY DEFINER` apenas porque RLS não possui INSERT em `profiles`; fixar `search_path`; revogar `PUBLIC` e conceder somente a `authenticated`.

- [ ] **Step 3: Fazer revisão estática de privilégios**

Run: `supabase db lint` ou o advisor equivalente, sem aplicar a migration.  
Expected: nenhum alerta de função exposta a `PUBLIC`; qualquer alerta restante deve ser documentado.

- [ ] **Step 4: Atualizar o contrato com SQL pendente de aprovação**

Inclua impacto, rollback e o identificador exato do projeto alvo.

- [ ] **Step 5: Commit de preparação**

```bash
git add supabase/migrations supabase/tests docs/NEXUS_PROVISIONING_CONTRACT_20261016.md
git commit -m "docs(auth): prepare secure provisioning migration"
```

### Task 3: Aplicar e testar a migration somente após aprovação SQL

**Files:**
- Modify: `supabase/migrations/<timestamp>_add_secure_user_provisioning.sql`
- Modify: `supabase/tests/provisioning_rls.sql`
- Modify: `docs/AUTONOMIA_NEXUS.md`

**Interfaces:**
- Consumes: migration aprovada da Task 2 e duas identidades de teste autorizadas.
- Produces: RPC implantada em `qidstqsbxwkbkwowhpab` e evidências de idempotência.

- [ ] **Step 1: Apresentar o SQL final, impacto e rollback ao responsável**

Expected: aprovação expressa antes de `execute_sql` ou aplicação de migration.

- [ ] **Step 2: Executar o teste controlado de primeiro cadastro**

Crie somente identidades de teste autorizadas; valide retorno da RPC, organização criada e perfil `admin`.

- [ ] **Step 3: Repetir a chamada e executar chamadas concorrentes controladas**

Expected: um perfil e uma organização por `auth.uid()`; sem duplicidade ou elevação para `superadmin`.

- [ ] **Step 4: Revisar advisors, logs Auth/Postgres/API e rollback**

Expected: APROVADO ou evidência objetiva do bloqueio; não aplicar correções adicionais sem novo diagnóstico.

- [ ] **Step 5: Atualizar documentação e commit**

```bash
git add docs/AUTONOMIA_NEXUS.md supabase/tests/provisioning_rls.sql
git commit -m "test(auth): verify secure provisioning"
```

### Task 4: Corrigir o fluxo de convite e validar isolamento

**Files:**
- Modify: `supabase/functions/invite-organization-member/index.ts`
- Modify: `src/services/coreServices.ts`
- Create: `supabase/tests/invite_and_tenant_isolation.sql`
- Modify: `docs/AUTONOMIA_NEXUS.md`

**Interfaces:**
- Consumes: `membersService.invite(params)`, `profiles`, `user_module_permissions`, função de convite.
- Produces: convite com perfil criado no tenant do solicitante e testes negativos de tenant.

- [ ] **Step 1: Escrever casos negativos de convite e isolamento**

Cubra admin A -> usuário A, admin A -> tenant B, operador -> convite e leitura/escrita de permissões entre A e B.

- [ ] **Step 2: Executar os casos contra identidades de teste**

Expected: apenas admin do mesmo tenant cria convite/permissões; demais ações retornam erro de autorização.

- [ ] **Step 3: Ajustar somente o ponto confirmado pelo teste**

Se houver falha parcial Auth/perfil, adicionar estratégia explícita de recuperação idempotente. Não remover verificação de token ou usar metadados como autorização.

- [ ] **Step 4: Validar Deno, TypeScript, build e logs da Edge Function**

Run: `deno check --node-modules-dir=auto supabase/functions/invite-organization-member/index.ts && npm run lint && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/invite-organization-member/index.ts src/services/coreServices.ts supabase/tests docs/AUTONOMIA_NEXUS.md
git commit -m "fix(invites): enforce tenant-safe provisioning"
```

### Task 5: Verificar Preview Vercel sem alterar Production

**Files:**
- Modify: `docs/AUTONOMIA_NEXUS.md`

**Interfaces:**
- Consumes: deployment Preview da branch e variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` administradas de modo seguro.
- Produces: evidência de browser que o Preview autentica contra `qidstqsbxwkbkwowhpab`.

- [ ] **Step 1: Inspecionar valores de Preview por mecanismo seguro sem registrá-los no repositório ou chat**

Confirme apenas a correspondência URL/chave do mesmo projeto; não revelar chave.

- [ ] **Step 2: Criar novo Preview após a validação da migration**

Não alterar Production.

- [ ] **Step 3: Testar no navegador cadastro, login, logout, sessão e rota protegida**

Capture console/rede; não informe APROVADO se houver `AuthRetryableFetchError`, 401 inesperado ou perfil ausente.

- [ ] **Step 4: Registrar deployment, SHA e resultado**

Atualize `docs/AUTONOMIA_NEXUS.md` com APROVADO/REPROVADO/NÃO VERIFICADO/BLOQUEADO.

- [ ] **Step 5: Commit**

```bash
git add docs/AUTONOMIA_NEXUS.md
git commit -m "docs(vercel): record auth preview validation"
```

## Self-review

- Cobertura: a RPC, RLS, convite, browser Preview, logs e o bloqueio de Production possuem tarefas correspondentes.
- Consistência: Tasks 3–5 consomem a RPC e as identidades controladas produzidas/validadas nas Tasks 2–3.
- Segurança: toda alteração de banco possui portão de aprovação SQL; nenhum passo altera Production.
- Proporção: o plano prescreve contratos e verificações sem incorporar a implementação SQL.
