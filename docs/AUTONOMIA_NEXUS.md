## OBRAMAXAUTO + SUPERPOWERS — 16/10/2026: CONFIABILIDADE DE EXCLUSÕES, PERFIS E ATUALIZAÇÕES

**PERÍMETRO ATUAL:** repository `dinheirodegraca013-spec/teste-nexus-teste`, branch `fix/persist-rbac-permissions`; Supabase DEV autorizado `qwvbvqlzcyfkuszxrlgv`. As referências a `qidstqsbxwkbkwowhpab` abaixo são histórico de auditorias anteriores.

> **Fonte de verdade operacional:** desde a inicialização do novo ambiente, use exclusivamente o Supabase DEV `qwvbvqlzcyfkuszxrlgv`. Blocos abaixo que citam `qidstqsbxwkbkwowhpab` preservam evidências históricas e não autorizam novas consultas, SQL ou alterações.

### DEL-02 — Oito exclusões adicionais protegidas (TDD RED/GREEN)

- **Causa raiz:** `delete().eq('id',id)` sem `.select('id')` pode retornar `error=null` mesmo se nenhuma linha foi apagada por RLS/ID inexistente. O frontend poderia mostrar confirmação falsa.
- **RED:** commit `b66d7bf013` expandiu `tests/confirmed-deletions.test.mjs`; oito cenários negativos falharam no CI `38972766424` como esperado.
- **GREEN:** commit `74902272e2` corrigiu `coordinators`, `leaders`, `crm_contacts`, `goals`, `campaign_events`, `meetings`, `materials_inventory`, `popular_demands`. Todas agora exigem a linha devolvida por `.select('id').maybeSingle()` e usam `confirmDeletedRow`.
- **Evidência:** GitHub Actions `38972836083` e `38972853875` aprovados, além das três exclusões já corrigidas no ciclo anterior.
- **Escopo:** os testes usam fronteira mockada de Supabase; não fazem DELETE real.

### AUTH-02 — Proibir exclusão direta de perfis (TDD RED/GREEN)

- **Causa raiz:** `profilesService.delete` tentava apagar `public.profiles` no navegador. Isso **não** desativa o usuário no Supabase Auth nem revoga sessões existentes.
- **RED:** commit `33a2488746` adicionou teste a `tests/member-operations.test.mjs`; CI `38972916979` falhou corretamente no caso de exclusão insegura.
- **GREEN:** commit `6c72342fc2`: a chamada direta falha explicitamente com `PROFILE_DELETE_FORBIDDEN` sem tocar em tabelas; CI `38972994021` e `38973000000` aprovados.
- **PENDENTE:** implementar revogação/bloqueio REAL por endpoint administrativo autenticado, com auditoria, impacto de sessões e teste E2E antes de liberar a interface. Essa implementação precisa de revisão/autorização específica.

### UPDATE-02 — Onze atualizações exigem linha modificada (TDD RED/GREEN)

- **Causa raiz:** `.update(...).select().maybeSingle()` pode retornar `data=null,error=null` se nenhuma linha foi alterada, permitindo sucesso falso.
- **RED:** `tests/confirmed-updates.test.mjs`, commit `e8ad69a5a5`, com 33 cenários de ausência, sucesso e erro; os 11 cenários de zero linhas falharam em CI `38973147088` como esperado.
- **GREEN:** commit `8ffbf591ab` criou `confirmUpdatedRow` com `UPDATE_NOT_APPLIED` e aplicou a **11 serviços** (coordenações, lideranças, CRM, metas, eventos, reuniões, presenças, materiais, carros, casas e demandas). CI `38973265254` e `38973272157` aprovados.
- **Limites:** testes com mocks da API cliente, não equivalem a transações SQL autenticadas ou testes de interface.

### BACKLOG PRIORITÁRIO

1. **CRÍTICO:** RLS/RBAC por módulo nas cinco tabelas operacionais restantes; exige matriz de acesso, testes negativos e autorização específica para SQL (não ampliar grants antes da verificação).
2. **ALTO:** revogação segura da conta do Supabase Auth com logs, sessões e autorização de tenant. `membersService.remove` e `profilesService.delete` devem permanecer bloqueados até homologação.
3. **ALTO:** Storage privado de fotos e isolamento de objetos em `docs/PRIVATE_STORAGE_DESIGN.md`, com migração e aprovação específica pendentes.
4. **ALTO:** E2E autenticado multiusuário/multitenant do login, convite, gestão de equipe, CRUD e fotos com credenciais de teste, sem dados reais.
5. **MÉDIO:** auditar retornos de `INSERT` e outras operações fora do conjunto acima para impedir confirmação de persistência inexistente; reproduzir primeiro.
6. **OPERACIONAL:** conferir CI do HEAD documental; manter PR #1 em rascunho, sem merge/deploy produção.

**Não afirmar que o NEXUS inteiro está homologado.** O executor do GitHub continua independente das sessões de ChatGPT, sujeito a credenciais, limites e CI.

---

## CICLOS OBRAMAXAUTO + SUPERPOWERS — 16/10/2026 — TESTES EXECUTADOS

**Registro histórico:** este ciclo ocorreu antes da migração para o ambiente DEV atual `qwvbvqlzcyfkuszxrlgv`. O Supabase `qidstqsbxwkbkwowhpab` citado neste bloco é somente histórico; não executar novas operações nele.

### FIELD-01 — Escolha explícita de liderança no cadastro de contato

- **Causa-raiz:** validação anterior exigia `contactLeader` mas a interface não oferecia controle para um administrador selecionar a liderança; o `loadData` ainda zerava a seleção do admin a cada atualização.
- **TDD RED:** `tests/field-assignment.test.mjs` recebeu dois testes; CI do commit `99c5165` falhou em ambos como esperado.
- **Implementação:** `0a29d73`, adicionando Select com lideranças recebidas do Supabase sob RLS e preservando somente escolhas ainda visíveis.
- **Depuração:** o CI do primeiro patch falhou por asserção antiga incompatível com o novo comportamento; o commit `6daff24` atualizou o teste para verificar preservação apenas de escolhas válidas.
- **GREEN:** duas verificações Actions do commit `6daff24` concluíram com sucesso (`38971722730` e `38971727817`).
- **Limite:** o teste do seletor é de regressão por inspeção do componente; falta teste autenticado de interface/browser.

### DATA-02 — Deleções que não alteram registros não podem reportar sucesso

- **Causa-raiz:** PostgREST pode devolver `error=null` para DELETE afetando zero linhas por RLS/registro ausente; os três serviços comunicavam sucesso sem examinar o resultado.
- **TDD RED:** nove testes em `tests/confirmed-deletions.test.mjs`, commit `ee33fe8`; CI falhou nos três cenários de exclusão sem linha afetada, mantendo cenários de sucesso e erro intactos.
- **Implementação:** `f584de3`; métodos de remoção de presenças, carros e casas agora solicitam `.select('id').maybeSingle()` e exigem linha confirmada; retornam `DELETE_NOT_APPLIED` caso contrário.
- **GREEN:** GitHub Actions `38972010244` e `38972014497` concluíram com sucesso. Testes usaram mocks de Supabase e não removeram registros reais.
- **Limite:** há outros métodos DELETE no projeto que ainda devem ser auditados sob a mesma regra; não declarar toda a camada de exclusão homologada.

### FIELD-03 — Remover metas fictícias do painel de campo

- **Causa-raiz:** na ausência de liderança/meta, a UI exibia metas arbitrárias 10/50/30/20, interpretáveis como metas reais.
- **TDD RED:** `tests/field-goal-display.test.mjs`, commit `aa6f85c`; três verificações falharam no CI como esperado.
- **Implementação:** `2df3703`; as quatro métricas agora exibem `—` e `Sem meta` se o objetivo não estiver definido; metas reais positivas continuam produzindo porcentagens limitadas a 0–100%.
- **GREEN:** GitHub Actions `38972308889` e `38972314861` concluíram com sucesso.
- **Limite:** testes novos validam contrato do código-fonte; ainda não houve homologação de browser com contas reais.

### PRIORIDADES AINDA PENDENTES (sem falsa homologação)

1. Bloqueio/revogação segura de membro no Supabase Auth; alterações privilegiadas exigem autorização específica.
2. Bucket privado e políticas de evidências fotográficas: proposta em `docs/PRIVATE_STORAGE_DESIGN.md`, **SQL NÃO APLICADO**.
3. RBAC/RLS por módulo e hierarquia na escrita: políticas de acesso ainda incompletas, sem autorizar ampliação.
4. Testes autenticados E2E de dois tenants, convites, uploads, formulários e perfis; nenhuma credencial de teste foi fornecida neste ciclo.
5. Conferir o CI do commit documental que registra este ciclo antes de anunciar HEAD completamente validado.

**Procedimento do próximo executor:** ler este estado e o escopo, verificar HEAD/CI, escolher um bug reproduzível de alta prioridade dentro das restrições; implementar em ciclo RED → GREEN; não tocar SQL/produção nem dados reais sem autorização.

---

## CICLO OBRAMAXAUTO + SUPERPOWERS — 16/10/2026: vínculo obrigatório no Modo de Campo

- **Problema reproduzido:** `FieldPage` permitia enviar um contato sem liderança associada (`leader_id: undefined`), e mantinha um `contactLeader` antigo quando o RLS passava a retornar zero lideranças. Em nova revisão, o bloqueio sem liderança deixava `isSubmittingContact=true` e o botão carregando indefinidamente.
- **TDD RED:** testes adicionados em `tests/field-assignment.test.mjs`, CI no commit `48b5031688` falhou como esperado, antes da correção.
- **GREEN inicial:** `d41c1f142d` corrigiu ausência de liderança e limpeza de seleção; duas verificações GitHub Actions passaram.
- **Novo RED:** `59dd2afdd8` adicionou teste contra spinner preso; CI falhou como esperado.
- **Correção:** `34a181f106` moveu o início do estado de submissão para depois da validação de liderança; verificar CI do HEAD.
- **Riscos:** RLS ainda é autoridade de segurança; frontend não prova vínculo de sessão real sem E2E. Revogação de usuários, Storage privado e CRUD por papel ainda pendentes.
- **Restrições mantidas:** sem alterações no Supabase, sem merge, sem produção. Branch `fix/persist-rbac-permissions`.

---

## OBRAMAXAUTO — Ciclo de concorrência e logs (2026-10-16)

- Skills consultadas: `bug-hunter` e `qa-automation`.
- O workflow autônomo publicou `1005df4` e `c59bd4`: autorização para adesivo NÃO cadastra adesivagem aplicada; CI confirmou sucesso.
- Corrigida `FieldPage.tsx`: removida escrita de `goal_reached` baseada em estado antigo da UI após criar CRM. Dois operadores poderiam perder incrementos por concorrência; o progresso visual continua derivado das linhas persistidas em CRM. Para métrica materializada futuramente, implementar contador atômico de servidor com aprovação SQL.
- Também passaram a ser verificados os `error` retornados por todas as cinco consultas de carga de Campo, evitando mascarar indisponibilidade como lista vazia.
- Adicionado `tests/field-concurrency.test.mjs` para detectar reintrodução da atualização não atômica e perda de erros de consulta.
- Ainda pendente: bucket privado de fotos requer aprovação específica do SQL em `docs/PRIVATE_STORAGE_DESIGN.md`; revogação segura de Auth, integração E2E de convite, tratamento explícito de módulos com restrições de acesso.
- Escopo: apenas branch `fix/persist-rbac-permissions`; nenhuma alteração em Supabase ou produção neste ciclo.

---

## CICLO DE PRIVACIDADE — 16/10/2026 (OBRAMAXAUTO)

- **Skills consultadas:** `rbac-architect`, `supabase-expert` e `qa-automation`, instaladas no repositório.
- **Confirmado:** `FileUpload` gerava `data:image/*;base64`; páginas de presença, adesivagem e campo tentavam incluir fotos embutidas em `photo_url`. Adicionada proteção em `src/services/photoEvidenceGuard.ts` e nas seis operações de criação/edição das três tabelas, rejeitando base64, blob, URL remota e caminhos de outro tenant ANTES do Supabase. Testes `tests/photo-evidence.test.mjs` exercitam cenários negativos com mocks; CI anterior à última revisão aprovou esses testes.
- **Interface:** seis instâncias de `FileUpload` nas telas Campo, Presenças e Adesivagens estão temporariamente desabilitadas e explicam a indisponibilidade até Storage privado seguro. O registro sem foto continua disponível segundo as RLS existentes.
- **Identidade do líder:** tela Campo não utiliza mais coincidência de nome/e-mail nem o primeiro líder da lista como vínculo automático; líder com exatamente uma linha autorizada pode selecioná-la, demais papéis devem selecionar explicitamente.
- **Storage:** documento `docs/PRIVATE_STORAGE_DESIGN.md` apresenta proposta de bucket privado, policies e sequência de testes. **SQL não executado**, aguardando aprovação específica conforme `AGENTS.md` do NEXUS. Não existe permissão para o agente ligar bucket ou ampliar RLS sem essa aprovação.
- **Prioridade seguinte:** confirmar CI do HEAD; revisar se a interface de Campo exige seleção de liderança para as ações correspondentes; preparar migração e testes isolados do Storage antes de reabilitar upload. Permanecem pendentes convites E2E, revogação segura de usuários, escrita granular e frontend homologado.
- **Restrição:** apenas Supabase DEV `qidstqsbxwkbkwowhpab`; não tocar em main, banco antigo nem produção.

---

## CONTINUAÇÃO SEGURA — 2026-10-16: convites e revogação de controlador

- **Corrigido no código:** `membersService.invite` agora exige `data.success === true` e `data.member.id`; uma resposta com `error` no payload ou membro ausente não gera mensagem falsa de envio de convite.
- **Remoção de membros:** `membersService.remove` retorna `MEMBER_REVOKE_NOT_IMPLEMENTED`, sem tentar `DELETE` direto em `profiles`. O botão de remoção foi desabilitado na UI para não alegar revogação de login sem afetar Supabase Auth.
- **Revogação de controlador:** `teamScopeService.revokeController` chama apenas a RPC administrativa existente `nexus_set_controller_scope` com `p_enabled=false`. A opção aparece no modal de vínculo apenas para Controller. A RPC valida novamente identidade e organização.
- **Testes:** `tests/member-operations.test.mjs` cobre confirmação de convite, rejeição de resposta incompleta, remoção fail-closed, revogação de controlador e identificador inválido. Confirmar GitHub CI no HEAD antes de chamar todo o ciclo aprovado.
- **Bloqueio:** proposta de criar operações SQL adicionais para listar/remover vínculos de liderança/coordenação foi bloqueada pelas configurações de segurança da ferramenta e **NÃO aplicada** ao banco. Não afirmar que essas operações estão disponíveis.
- **Pendências prioritárias:** fluxo de bloqueio de membro sem exclusão, leitura autorizada de vínculos atualmente atribuídos (para não operar às cegas), validação real de convites e autenticação com usuários de teste, controle hierárquico de escrita, Storage privado com RLS, E2E de frontend. Não mesclar para main nem implantar produção até homologação.
- **Ambiente autorizado:** Somente Supabase DEV `qidstqsbxwkbkwowhpab`; PR #1 em rascunho.

---

## HIERARQUIA DE EQUIPE IMPLEMENTADA — 16/10/2026 (prioridade sobre histórico)

- **Escopo único:** Supabase DEV `qidstqsbxwkbkwowhpab`; nenhuma alteração nos Supabase históricos ou produção.
- **Banco:** migração `20261016202949_nexus_private_hierarchy_identity_and_scopes` aplicada: papel `controller`, tabelas privadas `nexus_team_memberships` e `nexus_controller_scopes`, chaves compostas para o mesmo tenant, RLS e sem grants de acesso direto a `authenticated`.
- **RLS:** migração `20261016203058_nexus_hierarchical_read_policies` aplicada. `leaders`, `coordinators`, `crm_contacts`, `field_presences` permitem leitura apenas do próprio tenant e escopo. Registros sem liderança continuam admin-only. INSERT/UPDATE/DELETE operacionais permanecem admin-only.
- **Atribuições administrativas:** migração `20261016203814_nexus_admin_managed_team_assignments` aplicada; RPCs `nexus_set_team_scope` e `nexus_set_controller_scope` exigem admin ativo, verificam tenant e cargo do membro, usam integridade FK e gravam `audit_logs`. Acesso anônimo ao EXECUTE negado.
- **Teste real de política no banco DEV:** `supabase/tests/nexus_hierarchy_two_tenants_rollback.sql` executado COM SUCESSO usando duas organizações, seis identidades fictícias em TRANSAÇÃO REVERTIDA, verifica administrador, líder, coordenador, controlador, leitor sem acesso e tentativas de atribuição cruzada/não-admin. Pós-teste: 0 organizações/usuários de teste, 0 memberships/scopes e 0 logs de teste persistidos.
- **UI:** `UsersPage` oferece atribuição de coordenação/liderança para membros relevantes, consumindo `teamScopeService` e RPCs validadas no servidor. Controller incluído no tipo `UserRole`, normalização e badges. A lista de convites inclui Controller e Liderança. O backend `invite-organization-member` foi implantado no Supabase DEV versão 2, ACTIVE com JWT obrigatório.
- **Compatibilidade temporária:** frontend autoriza apenas LEITURA de CRM/Presença para líder e de Coordenadores/Lideranças/CRM/Presença para coordenador; as escritas de campo continuam bloqueadas pelo banco. Controller tem permissão de módulo NEGADA por padrão até administrador configurar `user_module_permissions`, além do escopo no banco.
- **Restante NÃO HOMOLOGADO:** validar convites reais, E2E de navegador, telas e escrita por papel; implementar remoção/visualização de atribuições administrativas e testes de UX; revisar RLS de outros módulos e provisionar Storage privado. Não fazer merge ou deploy de produção sem aceite.
- **Próximo ciclo:** confira CI no HEAD desta branch, trate erros primeiro, depois trabalhe num bug verificável de convite/autorização ou Storage de fotos com testes negativos. Não criar permissões amplas para contornar bloqueio.

---

# ESTADO OPERACIONAL HISTÓRICO — NÃO USAR COMO PERÍMETRO ATUAL (16/10/2026)

> **PERÍMETRO OBRIGATÓRIO:** o ÚNICO Supabase autorizado para o NEXUS em desenvolvimento é `qidstqsbxwkbkwowhpab`. Os projetos `wrovgjhpyacmmetejiqk`, `qesiqjcpphkwryjvpzmq` e o Gestio `fbvcapoydkodpifkwjwg` são históricos/outros e NÃO PODEM SER ALTERADOS. As referências abaixo a projetos antigos são histórico, não instruções de execução.
>
> **Branch:** `fix/persist-rbac-permissions`; PR #1 permanece DRAFT, **sem merge e sem deploy de produção**.
> **Documento técnico de referência:** `docs/NEXUS_FULL_AUDIT_20261016.md`.
>
> **BANCO — alterações já aplicadas e verificadas APENAS em `qidstqsbxwkbkwowhpab`:**
> 1. `20261016201212_nexus_revoke_dangerous_client_table_privileges`: bloqueia `TRUNCATE`, `TRIGGER` e `REFERENCES` do cliente nas tabelas `organizations`, `profiles`, `user_module_permissions`; as verificações `has_table_privilege` passaram.
> 2. `20261016201613_nexus_allow_safe_self_profile_name_updates`: `UPDATE(name)` apenas ao próprio perfil com RLS; `role`, `organization_id`, `email` e `is_blocked` negados em grants.
> 3. `20261016201725_nexus_private_self_profile_phone_field`: coluna privada `phone` e `UPDATE(name,phone)` somente ao próprio perfil; grants validados.
>
> **FRONTEND — correções na branch:** `OrganizationsPage` não anuncia criação/troca de organização sem endpoint real; `profilesService.update` proíbe campos privilegiados, valida nome/telefone e não retorna sucesso para UPDATE afetando zero linhas; `ProfilePage` suporta limpar telefone, propaga mensagem de erro e valida senha mínima de oito caracteres. Testes `tests/profile-updates.test.mjs` adicionados. **APROVADO:** GitHub Actions CI `38961433148` e `38961425769`, commit `fbe9b398`, validaram TypeScript, testes de regressão, build de produção e Deno. CI do HEAD documental mais recente ainda deve ser conferido.
>
> 4. `20261016202405_nexus_sensitive_data_fail_closed_until_hierarchy`: proteção TEMPORÁRIA de `SELECT` nas sete tabelas sensíveis (CRM, líderes, coordenadores, presença, casas/carros adesivados, demandas); agora é obrigatório ser admin ativo da organização. **Impacto funcional conhecido:** coordenadores e lideranças não conseguem consultar essas tabelas até o vínculo hierárquico servidor/RLS ficar pronto. As 7 políticas foram verificadas no DB; NÃO relaxar sem testes negativos.
>
> **TESTE DE SEGURANÇA:** `supabase/tests/nexus_security_contract.sql` foi executado no Supabase correto sem exceções, comprovando o contrato estático de grants, RLS e políticas. **Limite:** não substitui E2E com usuários distintos de dois tenants.
>
> **SITUAÇÃO RESTANTE — NÃO HOMOLOGADO:** RLS sensível agora está temporariamente restrito aos admins; isolamento hierárquico granular e escrita por lideranças/coordenadores ainda não estão implementados; frontend não contempla Controlador e Profissional de Saúde; schema vivo tem migrações ainda não reproduzidas no GitHub; novo Supabase não possui buckets de fotos; `invite-organization-member` agora está IMPLANTADA no projeto correto (ACTIVE, versão 1, verify_jwt=true), porém convite/aceitação real NÃO homologados; testes E2E de dois tenants seguem pendentes. Não ampliar concessões RLS sem matriz de acesso e testes negativos.
>
> **PRÓXIMO CICLO AUTÔNOMO RECOMENDADO:** ler auditoria e conferir CI do HEAD; definir esquema de vínculo autenticado → coordenador/controlador/liderança, com papéis e organização validados e migração reversível na branch (NÃO aplicar automaticamente). Antes de liberar SELECT/INSERT/UPDATE por papel, exigir testes negativos por dois tenants e equipes distintas. Uma tarefa pequena, testável por ciclo; não mexer em produção. Runner autônomo do GitHub não pode aplicar novas migrações; migrações de desenvolvimento já aplicadas acima foram feitas via ferramenta Supabase sob solicitação do usuário.

---

# NEXUS — Estado de desenvolvimento autônomo (registro histórico)

Última atualização: 2026-10-16

## Estado geral

- Estado: EM DESENVOLVIMENTO
- Aprovação final: NÃO CONCEDIDA
- Repositório: `dinheirodegraca013-spec/teste-nexus-teste`
- Branch de trabalho: `fix/persist-rbac-permissions`
- PR principal: #1 — https://github.com/dinheirodegraca013-spec/teste-nexus-teste/pull/1
- Supabase citado neste registro: `qidstqsbxwkbkwowhpab` (histórico); o ambiente DEV atual é `qwvbvqlzcyfkuszxrlgv`, conforme o perímetro no topo deste documento.
- Vercel: projeto `prj_d1Xv2bMB8u5Iaztw2KhhMjZxgVnd`

## Trabalho confirmado

- Corrigido mapeamento de permissões do frontend para as colunas reais de `user_module_permissions`.
- Editor de usuários carrega e persiste permissões; valores ausentes começam negados por padrão.
- Fluxo de autenticação passou a falhar de forma segura para usuários convidados sem perfil provisionado.
- Migração `20261016010000_harden_profiles_rls_superadmin.sql` aplicada ao Supabase para endurecer políticas de perfil e impedir elevação de papel por auto-inserção.
- Migração `20261016011000_scope_rbac_permissions_to_tenant.sql` aplicada para limitar leitura/alteração/exclusão de permissões ao próprio usuário ou administradores da organização.
- Migrações correspondentes estão versionadas em `supabase/migrations/`.
- Adicionado workflow `.github/workflows/ci.yml` para executar typecheck (`npm run lint`) e build (`npm run build`) em pushes e pull requests.

## Avanços do ciclo atual

- O CI identificou erro de tipagem em `UsersPage.tsx`; a tipagem foi ajustada.
- Em execução de CI no commit `cddd1bfefa18a8d609c504e7565542fbea45e059`, as etapas de TypeScript e build de produção terminaram com sucesso, mas a execução global foi cancelada após o início de commits subsequentes. Isso não valida os commits posteriores.
- Identificado que o formulário antigo tentava inserir diretamente em `profiles`, sem ID de Auth e sem política de INSERT para usuários autenticados. O convite foi redirecionado para uma Edge Function server-side.
- Criada `supabase/functions/invite-organization-member/index.ts`: valida JWT, perfil ativo e papel administrativo, limita a organização de destino, impede conceder papel admin por convite comum e usa credenciais administrativas somente no servidor.
- A Edge Function ainda NÃO foi implantada no Supabase; o formulário de convite não deve ser considerado validado até que a função seja revisada, validada e implantada.
- O CI foi ampliado para executar `deno check` na Edge Function. O resultado da execução sobre o estado mais recente ainda não foi confirmado.
- Os deploys Vercel continuam falhando antes de fornecer logs de build, com `Resource provisioning failed`; isso permanece um bloqueio de infraestrutura independente do erro de TypeScript já corrigido.

## Executor externo recorrente

- PR #2 (`feat(automation): add gated hourly NEXUS Codex runner`) foi mesclado na `main` em `39f05a749c47b417c341776c2e64b22374f6b206`.
- O workflow `.github/workflows/autonomous-nexus.yml` está no branch padrão e agenda ciclos horários, mas permanece **desativado** até a variável de repositório `NEXUS_AUTONOMY_ENABLED=true`.
- Também é necessário cadastrar o segredo de GitHub Actions `OPENAI_API_KEY`. Não compartilhar a chave na conversa nem gravá-la no repositório.
- O runner usa a GitHub Action oficial do Codex, trabalha apenas na branch de desenvolvimento, executa validações antes de persistir alterações e não faz merge, deploy de produção nem aplica migrações.
- A execução horária não é um processo 24/7 ininterrupto garantido. A configuração de orçamento de API ainda é necessária antes de ativar.

## Validação e implantação mais recentes

- Execução GitHub Actions `NEXUS CI` #28: **APROVADO** para `npm run lint` (TypeScript), `npm run build` e `deno check --node-modules-dir=auto supabase/functions/invite-organization-member/index.ts`.
- A Edge Function `invite-organization-member` foi implantada no Supabase e está com status `ACTIVE`, versão 1, com verificação JWT obrigatória (`verify_jwt=true`).
- O código da função e a chamada pelo frontend estão versionados na branch de trabalho. O fluxo ainda precisa de teste ponta a ponta com uma conta administrativa autorizada e um endereço de teste, para comprovar o convite, criação do perfil e login após aceitação. Não foi criado nem alterado nenhum usuário real como teste.
- A falha Deno inicial foi corrigida no CI ao habilitar a resolução automática de dependências npm. A execução final #28 passou nos dois jobs.
- O Vercel segue falhando antes da compilação com `Resource provisioning failed`; não foi feita publicação em produção pelo Vercel.

## Falhas e limitações confirmadas

- Deploys de Preview do Vercel falharam com `BUILD_FAILED: Resource provisioning failed`; a API não retornou eventos de build. A causa raiz ainda NÃO foi determinada.
- O repositório não contém `package-lock.json`; o CI usa `npm install` e ainda precisa ser executado e avaliado.
- O PR #1 não deve ser mesclado até que CI/build, revisão de segurança e testes sejam satisfatórios.
- Ainda não foram executados testes reais de isolamento entre duas organizações.
- A tabela `public.profiles` tinha um único perfil e nenhum papel `superadmin` na última consulta. Não criar ou promover um superadmin arbitrariamente; resolver bootstrap somente após identificar com segurança o usuário autorizado.
- O fluxo de provisionamento de convites ainda requer validação ponta a ponta.
- Variáveis de ambiente Supabase existem no Vercel para Preview e Production, mas a correspondência dos valores ao projeto correto não foi validada. Nunca imprimir valores secretos.

## Próxima fila de trabalho

1. Verificar execução do novo workflow de CI e corrigir erros de lint/typecheck/build.
2. Investigar a falha de provisionamento do Vercel com logs de execução e configuração do projeto, sem mudar a produção por tentativa e erro.
3. Inspecionar as políticas atuais e funções de provisionamento do Supabase; validar permissões e isolamento entre organizações com identidades de teste não destrutivas.
4. Validar login, perfil, convites e persistência de permissões.
5. Executar auditoria de regressão e atualizar este arquivo com evidências reais.
6. Só depois considerar merge e deploy de produção.

## Regras de segurança e operação

- Não apagar ou sobrescrever dados reais como teste.
- Não expor chaves, tokens ou valores de variáveis de ambiente.
- Não desabilitar RLS para contornar falhas.
- Não criar/promover `superadmin` sem identificar o usuário e um procedimento seguro.
- Não mesclar PR nem publicar produção até que os critérios de validação passem.
- Para alterações de banco, revisar SQL e impacto; manter migrações versionadas e reproduzíveis.
- Separar claramente resultados APROVADO, REPROVADO, NÃO VERIFICADO e BLOQUEADO.
- Manter o estado EM DESENVOLVIMENTO até o usuário declarar explicitamente: **APROVADO — ENCERRAR O DESENVOLVIMENTO**.

## Limite de continuidade

Há uma automação recorrente do ChatGPT configurada para retomar o diagnóstico e o desenvolvimento a cada hora. Isso fornece retomadas agendadas, não um processo de execução ininterrupto garantido. Um agente externo 24/7 real ainda exige um executor persistente com credenciais de API armazenadas em um cofre, limites de custo, logs, isolamento e política de aprovação. Não afirmar que existe um daemon contínuo enquanto ele não estiver implantado e comprovado.

## Auditoria local — isolamento de carregamento de sessão

- **Causa-raiz confirmada:** `loadUserDataSafe` mantinha uma única promessa em andamento. Durante troca rápida de sessão, uma segunda identidade podia receber o resultado de perfil, organização e permissões da primeira.
- **RED/GREEN:** `tests/auth-profile-loading.test.mjs` reproduziu a concorrência com duas identidades sintéticas. A versão anterior falhou ao não iniciar a segunda consulta; após a correção, cada identidade é deduplicada em uma `Map` por `authUser.id`.
- **Verificado localmente:** `npm test` (158 testes), `npm run lint`, `npm run build` e `git diff --check` concluíram sem falhas. Não houve chamada autenticada ao Supabase, deploy, merge ou alteração de dados.
- **Auditoria Supabase DEV:** o projeto `qidstqsbxwkbkwowhpab` está saudável, mas o advisor aponta três funções `SECURITY DEFINER` executáveis por `authenticated` (`provision_new_user`, `nexus_set_team_scope`, `nexus_set_controller_scope`), duas tabelas privadas sem policy e proteção contra senhas vazadas desativada. Revisar e apresentar SQL antes de qualquer alteração estrutural.


## Verificação independente — 2026-10-16

- **APROVADO:** GitHub Actions `NEXUS CI` run #32, associado ao commit atual da PR #1 (`574175221977aeebb57fd633873ccfacc367501d`), terminou com sucesso. Os dois jobs concluíram: TypeScript/build de produção e validação Deno da Edge Function.
- **APROVADO:** os passos registrados no run #32 incluem instalação de dependências, `npm run lint`, `npm run build` e `deno check` da função `invite-organization-member`, todos com sucesso.
- **NÃO VERIFICADO:** não há execução observada do workflow `NEXUS Autonomous Engineering Cycle` no commit incorporado à `main` (`39f05a749c47b417c341776c2e64b22374f6b206`). O workflow permanece propositalmente condicionado à variável `NEXUS_AUTONOMY_ENABLED=true`; não foi alterada qualquer variável, segredo ou configuração de Actions nesta verificação.
- **BLOQUEADO:** o status Vercel falha tanto na `main` quanto no head atual da PR #1. Os deployments inspecionados retornam `BUILD_FAILED: Resource provisioning failed` e não possuem eventos de build. Dois deployments distintos, inclusive `dpl_9KojAk4hr3JKtZJbxQJjftpUJbH6` e `dpl_4fkUSTCfyCmpvNsfVNC4bdJv5Hm4`, apresentaram o mesmo padrão. Isso confirma que a falha ocorre antes de logs de compilação úteis; a causa raiz ainda não foi fornecida pela API e não pode ser atribuída ao código com a evidência atual.
- **NÃO VERIFICADO:** não há logs de runtime para esses previews; além de o deployment não ter ficado pronto, a consulta histórica excede a retenção do plano Hobby. Nenhuma configuração de Vercel, produção ou integração foi modificada como tentativa de correção.
- **BLOQUEADO:** a PR #1 segue em rascunho e não será mesclada. Ainda faltam revisão de segurança das políticas RLS aplicadas, teste E2E do convite com identidade de teste autorizada e validação de isolamento entre organizações.

## Próximas ações verificáveis

1. No painel da Vercel, verificar eventos de provisionamento/limites da conta e abrir chamado de suporte se a plataforma não expuser detalhe adicional; anexar os IDs de deployment acima.
2. Quando houver uma nova tentativa de preview, capturar os eventos imediatamente dentro da janela de retenção e correlacionar com o SHA da branch.
3. Revisar o diff completo da PR #1 e executar testes de autorização/isolamento com identidades de teste; não alterar dados reais.
4. Manter a PR #1 sem merge até que essas evidências, incluindo preview ou explicação documentada do bloqueio de Vercel, estejam satisfeitas.


## Continuação da verificação — 2026-10-16

- **APROVADO:** GitHub Actions `NEXUS CI` run #34 no commit `966914cc97eee3fd9a9fa781453c66b2876045c7` concluiu com sucesso. Os jobs de typecheck/build de produção e de validação Deno da Edge Function concluíram todas as etapas com sucesso.
- **REPROVADO:** o preview correspondente ao mesmo commit (`dpl_3BJktWNFuxYYbpawNXgGSqNrRCH3`) voltou a falhar em aproximadamente 0,5 s com `BUILD_FAILED: Resource provisioning failed`, sem eventos de build retornados.
- **NÃO VERIFICADO:** a API de projeto confirma Vite e Node 24.x, mas não disponibiliza parâmetros suficientes para identificar a origem do provisionamento que falhou.
- **EVIDÊNCIA NEGATIVA:** a listagem de configurações de integrações de provisionamento do time, na visão de projeto, retornou vazia. Isso reduz a hipótese de uma integração de provisionamento configurada nesse projeto, mas não exclui indisponibilidade, cota ou erro interno da plataforma.
- **DECISÃO:** nenhuma alteração de configuração ou novo redeploy foi feito por tentativa e erro. PR #1 permanece em rascunho, sem merge.

## Auditoria ampliada — 2026-10-16

- APROVADO: GitHub CI #36, run 38855763078, commit fff73ab4eb339b942be36ff01aaf4c29715b610f, conclusão success.
- VERIFICADO: profiles possui id, organization_id, name, email, role, is_blocked, created_at e updated_at. Existem FKs para auth.users e organizations, e email único.
- VERIFICADO: Edge Function invite-organization-member está ACTIVE, versão 2, verify_jwt=true; campos utilizados no insert existem. NÃO VERIFICADO: convite ponta a ponta e recuperação de provisionamento parcial.
- VERIFICADO: as 20 tabelas públicas enumeradas têm RLS habilitado e pelo menos uma policy. CRM e Finance têm políticas de escrita por tenant e permissões; organizations possui somente SELECT por tenant. Policies de profiles e user_module_permissions foram inspecionadas estaticamente; isolamento real com duas identidades ainda NÃO VERIFICADO.
- RISCO A REVISAR: SELECT de crm_contacts e finance_transactions filtra tenant, mas não verifica nexus_can_read por módulo. Determinar regra de negócio e preparar testes antes de alterar políticas.
- BLOQUEADO: deployment Vercel dpl_B76yLj4LDnTiWn9wzAwdp7T9Aa8V falhou com BUILD_FAILED / Resource provisioning failed e sem eventos de build; Vite e Node 24.x confirmados. Não há causa raiz identificada.
- ATENÇÃO: existem commits concorrentes na branch e função implantada na versão 2; reler HEAD e comparar código antes de alterações ou redeploy.

### Prioridades do próximo ciclo

1. Obter evidências de provisionamento no painel/suporte da Vercel, citando deployment ID.
2. Testar RLS/RBAC com duas organizações e identidades controladas sem tocar dados reais; revisar leitura por módulo.
3. Testar convites E2E, duplicidade e recuperação de falhas parciais com conta autorizada.
4. Comparar código da função implantada versão 2 com a branch atual antes de nova implantação.
5. Manter PR #1 aberto e produção inalterada até validação.

## Atualizacao do ciclo — 2026-10-16: destino Supabase e build

- DESTINO AUTORIZADO PELO USUARIO: projeto Supabase `qesiqjcpphkwryjvpzmq` substitui `wrovgjhpyacmmetejiqk`. Nao executar novas alteracoes no banco antigo.
- BLOQUEADO: o conector administrativo Supabase respondeu `You do not have permission to perform this action` ao consultar o destino. Schema, RLS, Auth, Storage, migracoes, funcoes e dados do novo projeto seguem NAO VERIFICADOS.
- VERIFICADO: o frontend usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. No Vercel, `VITE_SUPABASE_URL` ainda aponta para o banco antigo; a chave Vite nao foi autenticada como pertencente ao destino. Nao substituir somente URL.
- APROVADO: deployment production Vercel `dpl_8BskAHSEmn9DX1jSmysKTMaEyDVJ` esta READY, com `vite build` concluido segundo 63 eventos observados. NAO VERIFICADO: login e conexao com Supabase novo. Nao publicar mudancas em Production antes dos testes.
- APROVADO: corrigido aviso de dependencia duplicada `vite` no `package.json`, commit `b67da35956774016200b5cb60a37e26277b8fb6e`, somente na branch `fix/persist-rbac-permissions`. CI `38874847419` concluiu success.
- PERSISTENCIA: issue GitHub #3 registra verificacoes e plano de migracao: https://github.com/dinheirodegraca013-spec/teste-nexus-teste/issues/3
- CONTINUIDADE: automacao ChatGPT `Ciclo autonomo NEXUS` (id `6ad1af88b44081919dfbe4dedf598ecf`) ativa de hora em hora. Prompt atualizado para destino Supabase novo. O runner GitHub Actions segue condicionado a `NEXUS_AUTONOMY_ENABLED=true` e `OPENAI_API_KEY`; nao declarar autonomia CI ativa ate confirmar essas configuracoes e observar uma execucao.
- ESTADO FINAL DESTE CICLO: EM DESENVOLVIMENTO. PR #1 continua rascunho; sem merge; sem mudanca em banco de producao; sem troca de credenciais Vercel; sem publicacao nova na main.

### Proximas acoes

1. Obter autorizacao administrativa para consulta ao novo Supabase e auditar schema, Auth, RLS e dados antes da migracao.
2. Revisar confiabilidade dos convites e seguranca por modulo na branch, com testes de autorizacao isolados.
3. Confirmar as duas variaveis Vite do destino no ambiente Preview, sem divulgar segredos, quando o banco estiver validado.
4. Rodar testes E2E, revisar PR e registrar a decisao de corte; preservar deployment READY existente ate entao.

## Ciclo orientado por logs: otimizacao de carregamento — 2026-10-16

- Evidencia inicial Vercel preview dpl_HXXSpdodPaiPfen3HP3vbuaZ5UVk: JS principal 859,16 kB (gzip 225,08 kB), com alerta do Vite de chunk maior que 500 kB; build completado. CI #42 (38875008174) concluiu success, mas continha alerta equivalente de chunk maior que 500 kB (895,17 kB, gzip 235,15 kB). Os valores variam conforme bundler/ambiente.
- Correção #1: src/App.tsx migrou 19 importacoes estaticas de paginas privadas para React.lazy/Suspense. Commit a0d7e55a2b1b25a5db1e0136cb4cb2f8f3c36f43. Vercel preview dpl_4fkUzwRUFaS9ffpShTNZHMkTdcGe READY, log mostrou JS principal 641,95 kB (gzip 185,30 kB), ainda com alerta. CI #44 (38875593998) success.
- Correção #2: vite.config.ts configurou manualChunks para isolar o SDK @supabase em supabase-vendor. Commit 0f91e8e5c2efe515832210a6a06cf9e1dbbba3e5. Vercel preview dpl_FC9UEMEbMn1TVKrbWHUzMAmKR1gz READY e log mostrou JS principal 421,12 kB (gzip 127,60 kB) e supabase-vendor 220,44 kB (gzip 57,64 kB); nenhum aviso de chunk acima de 500 kB. CI #46 (38875708349) success.
- Resultado: APROVADO para build, typecheck e reducao comprovada do principal chunk de 859,16 para 421,12 kB (-50,99%); nao comprova funcionalidade do sistema no browser. Exigem teste adicional de navegacao por modulos dinamicos, login e recursos apos carregamento.
- Logs runtime: consulta Vercel de 1 hora retornou 400 por limite de retencao Hobby; consulta de 15 minutos nao retornou eventos com niveis error/fatal. Nao tratar ausencia desses registros como ausencia de erros de frontend: NEXUS usa SPA estatica e problemas do browser exigem capturar console e rede em teste E2E.
- Backend: Supabase DESTINO qesiqjcpphkwryjvpzmq continua sem permissao administrativa. Variaveis VITE no Vercel permanecem associadas ao Supabase antigo ate migracao validada, sem alteracao feita. PR #1 segue draft, sem merge e sem mudanca de producao.
- Proximos ciclos: conferir console de navegador via teste E2E automatizado, fluxos de auth, perfis, permissoes e orgs; auditar codigo do switchOrganization (atualmente solicita UPDATE de organization_id do proprio perfil, operacao sensivel). A pagina OrganizationsPage exibe criacao de organizacao nao comprovada no backend. Nao alterar schema nem confiar apenas no typecheck.

## Ciclo autônomo — 2026-10-16: falha de consulta de perfil

- Tarefa única concluída: impedir que falhas de leitura de `profiles` sejam interpretadas como ausência de perfil e acionem `provision_new_user` durante o carregamento da sessão.
- Inspeção inicial: branch atual `fix/persist-rbac-permissions`, HEAD `40220f9`, árvore limpa; nenhuma alteração humana sobrescrita. O código ignorava erros retornados pela consulta e capturava exceções/timeouts sem interromper o caminho de provisionamento.
- Correção em `src/contexts/AuthContext.tsx`: erros retornados ou lançados encerram o carregamento, limpam perfil, organização, lista de organizações e permissões em cache e registram erro de inicialização. Uma consulta bem-sucedida sem perfil mantém o fluxo existente e suas restrições para convidados.
- **APROVADO:** `npm test` (2 arquivos, saída 0); `node tests/auth-profile-loading.test.mjs` (4 casos, saída 0). Os testes executam o callback real do AuthProvider com hooks e serviços simulados: erro retornado, rejeição, TimeoutError simulado e ausência confirmada de perfil. Verificam ausência de chamada à RPC nos erros e limpeza do acesso anterior. Não comprovam a passagem real dos 7 segundos do temporizador nem integração com Supabase.
- **APROVADO:** `npm run lint` e `npm run build`, ambos saída 0; Vite 6.4.4 compilou 2171 módulos, sem alerta de chunk maior que 500 kB. `git diff --check` sem erros.
- **REPROVADO (intermediário, resolvido):** a primeira versão do novo teste falhou porque carregava o runtime JSX real com hooks simulados. O runtime também foi isolado; as execuções finais acima passaram. Aviso ambiental observado: `NO_COLOR` ignorado devido a `FORCE_COLOR`.
- **NÃO VERIFICADO:** login no navegador, convite E2E, isolamento efetivo entre tenants e comportamento de requisições concorrentes de sessão. Nenhuma conexão com banco, migração, alteração de função privilegiada, workflow, ambiente, segredo, merge ou deploy foi realizada.
- Destino permitido pelas instruções atuais: `qidstqsbxwkbkwowhpab`. Referências anteriores a outros projetos neste documento são histórico e não autorizam acesso; nenhum projeto foi consultado neste ciclo.
- Próxima ação: revisar concorrência de `loadUserDataSafe` e eventos de sessão com identidades sintéticas; o callback em andamento é compartilhado sem chave por usuário. Confirmar uma reprodução antes de alterar o código. Estado permanece EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-16: concorrência no carregamento de identidade

- **Tarefa única concluída:** impedir compartilhamento de perfil/permissões entre carregamentos concorrentes de usuários diferentes e impedir que respostas antigas restaurem acesso após troca de identidade ou logout.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `521a2db`; `git status --short` e diff inicialmente vazios. Lidos este documento primeiro, `OBRAMAXAUTO.md`, auditoria técnica e skills `bug-hunter` / `qa-automation`. Os arquivos raiz `ESCOPO.md`, `BACKLOG.md`, `ESTADO.md`, `TESTES.md` e `AUDITORIA.md` não existem neste checkout; registro persistente concentrado aqui, sem criar escopo substituto.
- **Causa confirmada:** `loadUserDataSafe` reutilizava qualquer promessa em andamento sem comparar `authUser.id`. O usuário B não era consultado e recebia o resultado de A. Também não havia invalidação de respostas após logout.
- **Correção:** `src/contexts/AuthContext.tsx` deduplica somente cargas do mesmo usuário; nova carga limpa acesso em cache e recebe geração própria. Respostas e erros antigos são descartados em cada etapa assíncrona, inclusive antes de iniciar provisionamento após uma consulta obsoleta. Logout, evento sem sessão e desmontagem invalidam cargas pendentes; cadastro passa pelo mesmo carregador protegido. A finalização de uma carga antiga não limpa o controle da carga nova. Requisições já enviadas não são canceladas.
- **REPROVADO (RED esperado, resolvido):** `node tests/auth-profile-loading.test.mjs` antes da correção: 4 casos aprovados e 3 falhas novas; consultas observadas somente para A quando se esperavam A e B. `node --test tests/auth-profile-loading.test.mjs` também retornou saída 1 nessa etapa.
- **APROVADO:** `node tests/auth-profile-loading.test.mjs`, saída 0, 9 casos: erros de consulta, ausência confirmada, deduplicação por usuário, troca A/B com resposta/perfil ausente/erro antigo e logout durante consulta de perfil ou organização. Hooks e serviços simulados exercitam callbacks reais do provider com identidades sintéticas; nenhuma rede ou dado real.
- **APROVADO:** `npm test`, saída 0 (14 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0, Vite 6.4.4 / 2172 módulos, sem alerta de chunk acima de 500 kB; `git diff --check`, saída 0. Aviso ambiental observado: `NO_COLOR` ignorado por presença de `FORCE_COLOR`.
- **NÃO VERIFICADO:** login/logout no navegador, eventos reais do SDK, isolamento RLS com dois tenants e convites E2E. Os testes não cobrem todas as intercalações dos métodos externos de autenticação (`signIn`, `getSession`, `signUp`) nem cancelam RPC já enviada. Não declarar autenticação inteira homologada.
- **Limites preservados:** sem banco, SQL, migração, deploy, merge, workflow, segredo ou arquivo de ambiente alterado. Trabalho somente neste checkout e branch atual; nenhuma mudança humana sobrescrita.
- **Próxima ação:** reproduzir com eventos sintéticos a corrida entre `getSession` inicial e `SIGNED_OUT` antes da resposta de sessão; só corrigir se confirmada. E2E autenticado com identidades controladas permanece pendente de ambiente de teste apropriado. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: sessão inicial obsoleta após evento de autenticação

- **Tarefa única concluída:** impedir que o resultado tardio de `getSession` inicial restaure a identidade após `SIGNED_OUT` ou substitua uma sessão mais recente recebida por `SIGNED_IN`.
- **Inspeção inicial:** branch atual `fix/persist-rbac-permissions`, HEAD `e9153f8`, árvore e diff limpos. Lidos este registro primeiro, `OBRAMAXAUTO.md`, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA continuam ausentes; evidências preservadas aqui.
- **Causa confirmada:** o efeito de inicialização verificava apenas montagem do componente antes de aplicar o snapshot de sessão. Um evento posterior não invalidava esse snapshot, permitindo nova consulta e carregamento de acesso do usuário antigo.
- **Correção:** `src/contexts/AuthContext.tsx` invalida o snapshot inicial ao receber evento diferente de `INITIAL_SESSION`, descarta resultado/erro/rejeição obsoletos e impede que sua finalização altere o estado de carregamento controlado pelo evento mais recente. O watchdog inicial é encerrado nesse evento. A invalidação de cargas de perfil existente continua responsável pelas respostas de perfil já em andamento.
- **REPROVADO (RED esperado, resolvido):** primeira execução de `node tests/auth-profile-loading.test.mjs`: nove casos anteriores passaram e quatro novos falharam. Observadas consulta indevida de `user-a` após logout/troca e substituição da sessão B por resposta antiga sem sessão.
- **APROVADO:** execução final de `node tests/auth-profile-loading.test.mjs`, saída 0, 16 casos. Os sete casos novos cobrem sessão, erro retornado e rejeição tardios após `SIGNED_OUT`/`SIGNED_IN`, além da inicialização normal sem evento posterior. Testes executam efeito e callbacks reais com hooks, serviços e eventos simulados, sem rede ou dados reais.
- **APROVADO:** `npm test`, saída 0 (14 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0 (Vite 6.4.4, 2172 módulos, sem alerta de chunk acima de 500 kB). Aviso ambiental sem falha: `NO_COLOR` ignorado por presença de `FORCE_COLOR`.
- **NÃO VERIFICADO:** navegador/SDK reais, RLS multitenant e convite E2E. Os testes não simulam todas as intercalações com `signIn`, `signUp`, `refreshUserData` ou múltiplos eventos simultâneos; nenhuma homologação integral de autenticação é declarada.
- **Limites:** somente código, teste e este documento alterados no checkout/branch atual. Sem SQL, banco, migração, workflow, ambiente, segredo, merge ou deploy. Nenhuma alteração humana sobrescrita; nenhum bloqueio impediu esta tarefa local.
- **Próxima ação:** reproduzir separadamente uma resposta tardia de `refreshUserData` após `SIGNED_OUT`, usando sessão sintética e promessa controlada; corrigir somente se o problema for confirmado. E2E permanece pendente de ambiente com identidades de teste. Estado: EM DESENVOLVIMENTO.
## Ciclo autônomo — 2026-10-16: contenção de leitura por módulo

- **APROVADO PELO USUÁRIO:** aplicação no Supabase DEV autorizado `qidstqsbxwkbkwowhpab` da migração `20261016210000_nexus_module_read_rls`.
- **APLICADO:** as políticas SELECT de `goals`, `campaign_events`, `meetings`, `materials_inventory`, `material_distributions`, `leaders`, `coordinators`, `crm_contacts` e `field_presences` agora exigem administrador ou a permissão explícita de módulo compatível com o escopo hierárquico.
- **APROVADO:** `supabase/tests/nexus_security_contract.sql` retornou sem falhas após a migração; inspeção em `pg_policies` confirmou 9 de 9 políticas contendo a verificação de `user_module_permissions`.
- **NÃO VERIFICADO:** teste autenticado de negação com duas organizações e papéis não administrativos. O ambiente não possui permissões de módulo provisionadas; não inferir cobertura real apenas da inspeção de policy.
- **PENDENTE:** os avisos de Security Advisor permanecem: tabelas privadas sem policy pública, três funções SECURITY DEFINER executáveis por `authenticated` e proteção de senhas vazadas desativada. Nenhuma dessas configurações foi alterada neste ciclo.
- **APROVADO:** validação transacional de RLS com fixtures descartadas por `ROLLBACK`: gestor sem `goals` recebeu 0 linhas; após a concessão explícita de `can_read`, recebeu 1 linha do seu tenant e nenhuma linha do segundo tenant. Nenhuma conta ou dado de teste permaneceu no banco.

## Ciclo autônomo — 2026-10-16: operações de organização

- **CORRIGIDO:** `organizationsService.update` agora falha fechado quando RLS não altera nenhuma linha, evitando confirmação falsa em páginas administrativas.
- **CORRIGIDO:** onboarding só exibe sucesso após confirmação da atualização da organização e, quando informado, da criação do coordenador.
- **CORRIGIDO:** a página de planos não altera mais a assinatura diretamente no navegador; alteração comercial exige fluxo próprio ainda não implementado.
- **APROVADO:** 163 testes, `npm run lint` e `npm run build` concluíram com sucesso. Próxima tarefa independente: revisar fluxos de configuração da organização e erros de integração sem sessão E2E.

## Ciclo autônomo — 2026-10-16: confirmação de criações

- **CORRIGIDO:** os serviços de criação operacionais passam a exigir a linha persistida antes de retornarem sucesso; respostas RLS vazias agora retornam `CREATE_NOT_CONFIRMED`.
- **COBERTURA:** coordenação, liderança, CRM, metas, eventos, reuniões, presença, materiais, distribuição, adesivagem e demandas possuem teste de resposta vazia e de sucesso confirmado.
- **APROVADO:** 24 testes específicos; suíte completa com 187 testes; `npm run lint`, `npm run build` e verificação de whitespace concluíram sem falhas.
- **PENDENTE EXTERNO:** commit, push, atualização do PR e preview dependem da identidade Git local do responsável; nenhuma identidade foi inferida.

## Integração remota — 2026-10-16

- **INTEGRADO:** commit remoto `e9153f8` de proteção contra respostas tardias de autenticação, sem reintroduzir a listagem ou a troca de organizações no navegador.
- **APROVADO:** conflitos resolvidos com 191 testes, `npm run lint`, `npm run build` e verificação de whitespace aprovados.
- **VERIFICADO:** o preview remoto da branch está `READY` no commit `e9153f8`; as alterações locais ainda aguardam identidade Git para commit e push.
- **VERIFICADO:** requisição autenticada pelo conector ao preview retornou HTTP 200 e o documento HTML do NEXUS. Isso não substitui validação de login, RBAC ou operações autenticadas.

## Ciclo autônomo — 2026-10-16: confirmação de permissões

- **CORRIGIDO:** `permissionsService.upsertPermissions` agora recusa lote vazio e exige retorno completo de todas as permissões solicitadas; RLS que oculte uma ou todas as linhas não gera confirmação de sucesso.
- **APROVADO:** testes de retorno vazio, parcial, completo e lote vazio; suíte total com 195 testes, lint, build e verificação de whitespace aprovados.
- **COMPLEMENTO:** lote parcialmente inválido agora é recusado antes da chamada ao banco, sem descartar entradas silenciosamente. Teste reproduziu a falha anterior; suíte com 196 testes, lint e build aprovados.
- **COMPLEMENTO:** confirmação compara usuário, módulo e ações efetivamente retornadas, não somente a quantidade de linhas. Teste reproduziu retorno divergente; 197 testes, lint e build aprovados.

## Revisão dos advisors — 2026-10-17

- **SEGURANÇA:** permanecem os avisos já registrados sobre duas tabelas privadas sem policies, três funções `SECURITY DEFINER` acessíveis por usuários autenticados e proteção contra senhas vazadas desativada. Não houve alteração no banco ou no Auth.
- **DESEMPENHO:** o advisor aponta duas FKs privadas sem índice de cobertura e 12 índices sem uso observado. Não remover índices com base apenas nesse indicador; verificar carga e planos antes de propor alteração estrutural.
- Referências: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys e https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index.
- Próxima ação: avaliar custo das duas FKs sob carga real e apresentar qualquer SQL estrutural para aprovação específica; manter commit e E2E pendentes da identidade Git e sessão de teste.

## Ciclo autônomo — 2026-10-17: inicialização da autenticação

- **CORRIGIDO:** uma resposta tardia de `getSession` não restaura a sessão depois de `SIGNED_OUT` nem sobrescreve um evento de autenticação mais recente.
- **EVIDÊNCIA:** teste isolado reproduziu a restauração indevida antes da correção e passou depois; não substitui validação em navegador com sessão real.
- **APROVADO:** 198 testes, `npm run lint`, `npm run build` e verificação de whitespace sem falhas.
- **PRÓXIMA AÇÃO:** validar o fluxo autenticado em navegador e publicar as alterações após obter identidade Git; revisar riscos de RLS sem executar SQL não aprovado.

## Ciclo autônomo — 2026-10-17: atualização tardia de sessão

- **CORRIGIDO:** `refreshUserData` não restaura sessão antiga após `SIGNED_OUT` quando a recuperação de sessão responde tardiamente.
- **EVIDÊNCIA:** teste isolado reproduziu o usuário antigo restaurado antes da correção e passou após o controle de geração; sem uso de rede, contas ou dados reais.
- **APROVADO:** 199 testes, `npm run lint` e `npm run build`. A validação autenticada no navegador permanece pendente.
- **PRÓXIMA AÇÃO:** auditar as demais intercalações de login e atualização; commit e PR continuam pendentes da identidade Git autorizada.

## Ciclo autônomo — 2026-10-17: saída concorrente com login

- **CORRIGIDO:** `SIGNED_OUT` durante o login invalida o carregamento do perfil; uma resposta de login anterior à saída não é aplicada ao estado da interface.
- **EVIDÊNCIA:** dois testes isolados falharam antes das correções e passaram depois; um terceiro confirmou o login sem saída concorrente. Os testes simulam o SDK e não comprovam invalidação de tokens ou comportamento em navegador real.
- **APROVADO:** 202 testes, `npm run lint` e `npm run build`; sem execução de SQL ou alteração em serviços externos.
- **PRÓXIMA AÇÃO:** validar sessões reais e logout entre abas em ambiente DEV; publicar a branch somente após identidade Git informada.

## Ciclo autônomo — 2026-10-17: evento inicial tardio

- **CORRIGIDO:** um evento `INITIAL_SESSION` recebido após outro evento de autenticação não sobrescreve o estado mais recente da interface.
- **EVIDÊNCIA:** a sequência sintética `SIGNED_OUT` seguida de `INITIAL_SESSION` restaurava o usuário antes da alteração e não restaura depois. A reprodução usa SDK simulado; a ordem efetiva entre abas não foi comprovada.
- **APROVADO:** 203 testes, `npm run lint` e `npm run build`; nenhum serviço externo foi alterado.
- **PRÓXIMA AÇÃO:** validar eventos reais e revogação de sessão em navegador DEV; publicar após obtenção de identidade Git.

## Ciclo autônomo — 2026-10-17: território no onboarding

- **CORRIGIDO:** o cadastro inicial não substitui mais território ausente por um valor fictício. Quando há coordenador, o território informado é exigido antes da atualização da organização; o coordenador continua opcional.
- **EVIDÊNCIA:** teste do componente com serviços simulados registrou criação indevida antes da correção; após a correção, confirmou bloqueio, cadastro informado e fluxo sem coordenador. Não houve gravação real.
- **APROVADO:** 206 testes, `npm run lint` e `npm run build`; não foi alterado banco ou serviço externo.
- **PRÓXIMA AÇÃO:** validar experiência e sessão no navegador DEV e publicar as alterações quando houver identidade Git autorizada.

## Ciclo autônomo — 2026-10-17: acessibilidade do login

- **CORRIGIDO:** o rótulo visível de senha está associado ao campo de entrada na tela de login.
- **EVIDÊNCIA:** no navegador local, a árvore de acessibilidade mostrava o campo sem nome; após a correção passou a identificá-lo como `Senha`. Teste automatizado de renderização falhou antes e passou depois.
- **APROVADO:** 207 testes, `npm run lint` e `npm run build`; servidor local de teste encerrado. Não houve login nem uso de credenciais.
- **PRÓXIMA AÇÃO:** validar login autenticado e sessões em ambiente DEV; publicação continua pendente de identidade Git.

## Revisão de CI e branch — 2026-10-17

- **VERIFICADO:** PR #1 permanece aberto e em rascunho; a branch remota avançou dois commits além de `e9153f8`, chegando a `e01b94e`, incluindo mudanças nos mesmos arquivos de autenticação e testes.
- **FALHA REMOTA:** CI `38995287973` reprovou o teste `zero-row organization update must not report success`; typecheck e validação das Edge Functions passaram, mas o build do job não rodou. Status Vercel do commit remoto: sucesso.
- **EVIDÊNCIA LOCAL:** os três testes remotos de confirmação de organização passaram contra a correção já preparada localmente; isso não altera nem comprova aprovação do CI remoto.
- **PRÓXIMA AÇÃO:** conciliar cuidadosamente os commits remotos e as alterações locais, preservando testes de ambos; obter identidade Git antes do commit, publicar a branch e verificar o novo CI. Não fazer force-push nem merge.

## Conciliação de branch — 2026-10-17

- **INTEGRADO:** branch local avançada por fast-forward até `e01b94e`; alterações locais reaplicadas e conflitos de documentação, autenticação e testes conciliados sem reescrever commits.
- **PRESERVADO:** testes remotos de inicialização, correções e testes locais; o stash de segurança anterior à conciliação permanece disponível.
- **APROVADO:** 217 testes, `npm run lint` e `npm run build`. O teste remoto antes reprovado também passou localmente; CI do PR ainda não foi atualizado.
- **PRÓXIMA AÇÃO:** obter nome e e-mail de autoria Git, criar commit e enviar a branch, sem incluir este documento local nem fazer merge ou deploy de produção.

## Observabilidade DEV — 2026-10-17 02:30–03:30 UTC

- **VERIFICADO:** consulta agregada e somente leitura no projeto DEV autorizado retornou 483 eventos, todos identificados como `pgbouncer_logs`; não foram expostos conteúdos dos registros.
- **LIMITAÇÃO:** a consulta de gravidade falhou porque `severity` não é campo disponível; a tentativa de descrição do esquema retornou erro do backend. As contagens não comprovam ausência de erros nem a cobertura dos serviços sem registros no intervalo.
- **COMPLEMENTO:** documentação oficial indica que a mensagem está em `event_message`. A busca agregada por palavras `error`, `fatal`, `panic`, `warning` ou `warn` encontrou zero ocorrências entre os 483 eventos do pooler, sem expor mensagens. Essa busca textual não equivale a uma classificação completa de erros.
- **PRÓXIMA AÇÃO:** manter validação autenticada em navegador pendente e não alterar configuração dos serviços. Referência: https://supabase.com/docs/guides/observability/advanced-log-filtering.

## Teste hierárquico multi-tenant — 2026-10-17

- **FALHA REPRODUZIDA:** o teste transacional de duas organizações falhou para o líder A após a política de leitura passar a exigir permissão de módulo; os dados sintéticos antigos não incluíam as concessões necessárias.
- **CORRIGIDO:** incluídas apenas concessões de leitura nas fixtures dos perfis testados, mantendo o visualizador sem concessões. Nenhuma política, função ou estrutura do banco foi alterada.
- **VERIFICADO:** o script passou no DEV autorizado com `ROLLBACK`, cobrindo leituras hierárquicas, dois tenants e chamadas RPC positivas e negativas previstas no script. Consulta posterior encontrou zero organizações, usuários e permissões das fixtures identificadas.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Testes emitiram aviso de variáveis Supabase ausentes neste ambiente; isso não valida autenticação no navegador.
- **PRÓXIMA AÇÃO:** reforçar o teste para verificar explicitamente os identificadores das linhas visíveis, além das contagens; obter identidade Git para publicar o PR sem incluir esta documentação local.

## Reforço do teste multi-tenant — 2026-10-17

- **VERIFICADO:** o teste de leitura agora combina contagem total com identificadores esperados de organização e de líder para administrador, líderes, coordenador e controlador; CRM e presença também conferem vínculo e organização. O teste não cobre toda a matriz de operações e perfis.
- **EVIDÊNCIA:** no DEV autorizado, uma alteração temporária no identificador esperado do líder para o administrador foi rejeitada; o script original passou. Os dois cenários foram transacionais, sem alteração de políticas ou funções, e após o rollback havia zero organizações, usuários e permissões identificados das fixtures.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. O aviso local de variáveis Supabase ausentes continua aplicável.
- **PRÓXIMA AÇÃO:** ampliar a cobertura dinâmica para negação por ausência de permissão e escopo intratenant, sem alterar políticas; obtenção de identidade Git segue necessária para publicar o PR.

## Escopo entre equipes da mesma organização — 2026-10-17

- **VERIFICADO:** foi adicionada uma segunda equipe sintética na organização A. No DEV, o administrador visualizou os dois líderes e contatos da sua organização; líder, coordenador e controlador testados continuaram vendo apenas o líder do seu escopo, e o líder viu apenas seu contato. O teste também mantém a organização B.
- **EVIDÊNCIA:** script transacional aprovado e `ROLLBACK`; contagens posteriores das organizações, coordenadores e líderes identificados nas fixtures foram zero. Nenhuma política ou função foi modificada.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Variáveis Supabase ausentes no ambiente local geraram aviso durante os testes.
- **PRÓXIMA AÇÃO:** cobrir dinamicamente os demais papéis e negação explícita por módulo; publicar PR depende da identidade Git e homologação autenticada continua pendente.

## Negação de leitura por módulo — 2026-10-17

- **VERIFICADO:** no DEV, um líder sintético com vínculo hierárquico e sem concessões não visualizou líderes, CRM ou presenças; outro líder com leitura de líderes e CRM explicitamente negado visualizou seu líder, mas não contatos.
- **EVIDÊNCIA:** o script passou com `ROLLBACK`. Duas mutações temporárias nas próprias fixtures, concedendo respectivamente líderes ao primeiro usuário e CRM ao segundo, provocaram as falhas esperadas; o script original voltou a passar. Não houve alteração de políticas ou funções. A consulta posterior encontrou zero usuários, vínculos e concessões dos dois novos perfis sintéticos.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Há aviso local de variáveis Supabase ausentes; isso não valida autenticação no navegador.
- **PRÓXIMA AÇÃO:** ampliar a matriz dinâmica para perfis bloqueados, outros papéis e ações de escrita; publicação do PR ainda depende da identidade Git.

## Perfis bloqueados no banco — 2026-10-17

- **VERIFICADO:** administrador e líder sintéticos bloqueados não visualizaram líderes nem CRM no DEV; o líder possuía vínculo e concessões explícitas de leitura. Esse resultado cobre somente os perfis e tabelas exercitados.
- **EVIDÊNCIA:** ao alterar temporariamente cada fixture para desbloqueada, o teste acusou a leitura esperada; o cenário original passou com `ROLLBACK`. Consulta posterior confirmou zero usuários, perfis, vínculos e concessões identificados dos dois perfis. Nenhuma política ou função foi alterada.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Persiste aviso local de variáveis Supabase ausentes.
- **PRÓXIMA AÇÃO:** avançar na matriz de escrita, outros papéis e testes autenticados em navegador; identidade Git ainda necessária para atualizar o PR.

## Escrita autenticada e isolamento — 2026-10-17

- **VERIFICADO NO DEV:** o administrador sintético inseriu e atualizou líder da própria organização; inserção cruzada foi rejeitada e atualização cruzada afetou zero linhas. Líder sem privilégio de escrita e administrador bloqueado não conseguiram inserir ou atualizar líder.
- **PERFIS:** o líder atualizou seu nome, não atualizou outro perfil e não conseguiu promover seu próprio papel. As operações foram restritas a fixtures e revertidas na transação; não foram executadas exclusões nem mudanças em políticas ou funções.
- **EVIDÊNCIA:** o teste passou; uma mutação temporária que substituiu o líder por administrador provocou a falha esperada para a asserção de atualização. Após `ROLLBACK`, organizações, líderes e perfis das fixtures consultadas tinham contagem zero. A cobertura não representa todas as tabelas, papéis ou operações.
- **VERIFICAÇÕES:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Permanece aviso local de variáveis Supabase ausentes.
- **PRÓXIMA AÇÃO:** avaliar escrita cruzada nas demais entidades e testes autenticados em navegador; a atualização do PR depende da identidade Git.

## Integração dos relatórios horários — 2026-10-17

- **CONECTADO:** a automação existente passou a consultar a conversa `NEXUS — Continuação automática` (`6ad27ddf-e454-83e8-83ae-6df0cb5699fc`) em suas execuções, tratando os relatórios como dados a verificar. A frequência, prazo e preferência de notificação anteriores foram preservados.
- **TRIAGEM:** o relatório aponta falha de carregamento em `GoalsPage.tsx`: inspeção do código mostra que as respostas de metas e coordenadores incluem `error`, mas a página usa apenas `data`; a ausência de organização também retorna antes de desligar o carregamento. Ainda falta reprodução automatizada antes da correção.
- **AUDITORIA DE INTEGRIDADE:** consulta somente leitura no DEV confirmou chaves estrangeiras compostas por organização para `crm_contacts.leader_id`, `field_presences.leader_id` e `leaders.coordinator_id`. A existência das constraints não substitui um teste de inserção e atualização adversarial.
- **PRÓXIMA AÇÃO:** reproduzir a falha de metas com testes e corrigir somente após comprovação; validar as referências cruzadas com fixtures transacionais. Não tratar estados antigos de CI ou preview do outro relatório como estado atual.

## Risco de integridade do estoque — 2026-10-17

- **CONFIRMADO POR INSPEÇÃO:** tanto o arquivo local quanto `MaterialsPage.tsx` da branch remota registram a distribuição e atualizam o saldo em chamadas separadas. A resposta de `updateItem` contém `error`, mas é ignorada antes da mensagem de sucesso; uma falha após a criação pode deixar saldo e histórico inconsistentes. Valores calculados no cliente também podem perder atualizações concorrentes.
- **LIMITAÇÃO:** não foi feita distribuição real nem teste concorrente. A inspeção não demonstra ocorrência em dados existentes, nem comprova o estado da produção. Uma correção completa requer operação atômica no servidor, testes de concorrência e aprovação específica para o SQL/função; não foi aplicado SQL.
- **ESTADO DO PR:** outro relatório indica avanço remoto para `0ca32966`; o arquivo remoto de materiais foi consultado diretamente, mas o estado atual completo de CI e do commit não foi verificado nesta rodada. Preservar as alterações locais e conciliar a branch antes de publicar.
- **PRÓXIMA AÇÃO:** especificar e testar uma operação transacional segura, apresentar o SQL para aprovação e revisar a interface para tratar falhas parciais sem permitir tentativas cegas duplicadas.

## Triagem de convite — 2026-10-17

- **CONFIRMADO LOCALMENTE:** `RegisterPage.tsx` aplica `decodeURIComponent` a valores já decodificados por `URLSearchParams`. Em Node, uma URL sintética com nome contendo `%` resultou em `URIError` na segunda decodificação.
- **LIMITAÇÃO:** não foi executado fluxo real de convite nem examinados dados pessoais. O relatório externo indica bloqueio de segurança ao tentar gravar a correção; não foi tentado contorná-lo.
- **PRÓXIMA AÇÃO:** verificar o motivo do bloqueio e obter autorização necessária antes de corrigir, com testes de regressão para `%`, caracteres Unicode e valores percentuais literais; conciliar a branch remota antes da publicação.

## Retomada e triagem de relatórios — 2026-10-17

- **BRANCH:** comparação somente leitura pelo GitHub mostrou a branch remota quatro commits à frente do HEAD local `e01b94e`; há alterações locais em arquivos também alterados remotamente. Preservar as alterações existentes e reconciliar antes de publicar; identidade Git local não está configurada.
- **AUTENTICAÇÃO:** o código local e o remoto chamam `provision_new_user` no cadastro com sessão imediata, sem condicionar a chamada ao papel ou vínculo de convite. A execução efetiva e o resultado da função no banco não foram testados nesta rodada; não concluir que houve criação indevida em dados reais. O outro relatório informa bloqueio de segurança ao tentar alterar esse fluxo; não foi repetida a operação bloqueada.
- **CSV:** o código local e o remoto incluem valores entre aspas sem escapar aspas internas nem neutralizar fórmulas. Uma reprodução sintética em Node gerou `"=1+1","Ana "A"","Rua #2"`; `encodeURI` deixou `#2` como fragmento da URL. Não foi aberto arquivo em planilha nem foram utilizados dados reais. O relatório externo informa bloqueio ao tentar gravar a correção; não foi repetida a operação bloqueada.
- **CI:** a consulta à execução `39057130731` retornou lista vazia de jobs; isso não comprova aprovação. A situação atual completa do CI e a aplicação da correção de convite continuam não verificadas.
- **VERIFICAÇÕES LOCAIS:** `npm test` passou com 217 testes; `npm run lint` e `npm run build` passaram. Os testes alertaram que as variáveis Supabase não estão configuradas neste ambiente; não houve teste autenticado.
- **PRÓXIMA AÇÃO:** esclarecer os bloqueios de segurança antes de repetir alterações, reconciliar a branch com preservação das mudanças locais e validar com testes sintéticos; não aplicar SQL estrutural, RLS ou funções privilegiadas sem apresentação e aprovação específica.

## Agenda de eventos — 2026-10-17

- **CORREÇÃO LOCAL:** o carregamento de eventos agora reconhece o erro retornado pelo serviço, mostra falha persistente com tentativa novamente e interrompe o carregamento se não houver organização. Alterações ainda não publicadas.
- **EVIDÊNCIA:** teste sintético da função real de carregamento falhou antes da correção por ausência de aviso e passou depois. `npm test`: 218 aprovados; `npm run lint` e `npm run build`: aprovados. Os testes alertam sobre variáveis Supabase ausentes localmente.
- **LIMITES:** teste não exercita o navegador nem troca de organização durante consulta em andamento. CI remoto e homologação autenticada não verificados nesta rodada.
- **PRÓXIMA AÇÃO:** testar a interface e mudanças concorrentes de sessão/organização; reconciliar branch remota e preservar alterações locais antes de publicar.

## Concorrência na agenda — 2026-10-17

- **REPRODUZIDO E CORRIGIDO LOCALMENTE:** uma resposta antiga sobrescrevia o resultado de atualização mais recente; o teste sintético falhou antes e passou depois. A versão da consulta também é invalidada na limpeza do efeito.
- **VERIFICAÇÕES:** `npm test`: 219 aprovados; `npm run lint` e `npm run build`: aprovados. Persistem avisos de configuração Supabase ausente nos testes.
- **LIMITES:** mudança de organização e desmontagem não foram reproduzidas em navegador; a correção não foi publicada e não substitui validação multi-tenant no servidor. Conciliar a branch remota preservando os arquivos existentes antes de publicar.

## Renderização da agenda entre organizações — 2026-10-17

- **REPRODUÇÃO SINTÉTICA:** com dados de outra organização já no estado, a renderização da agenda expunha o título antigo antes do efeito de carregamento. O teste de renderização isolada falhou antes da alteração e passou depois.
- **CORREÇÃO LOCAL:** a lista e sua contagem são exibidas somente se associadas à organização atual. `npm test`: 220 aprovados; lint e build aprovados. Há aviso de variáveis Supabase locais ausentes.
- **LIMITES:** sem teste de navegador real; revisão de modal aberto e ações pendentes durante troca de organização continua necessária. A correção não comprova isolamento no banco e ainda não foi publicada.

## Formulário de evento entre organizações — 2026-10-17

- **REPRODUÇÃO E CORREÇÃO LOCAL:** um modal de evento previamente aberto permanecia aberto na renderização de outra organização. Um teste sintético falhou antes e passou depois; a exibição e o envio agora verificam a organização de abertura, e o efeito limpa a seleção na mudança de organização.
- **VERIFICAÇÕES:** `npm test`: 221 aprovados; `npm run lint` e `npm run build`: aprovados. As variáveis Supabase seguem ausentes no ambiente de testes.
- **LIMITES:** não foi testado em navegador nem o resultado de uma gravação já iniciada antes da troca de sessão; proteção da interface não substitui RLS. Mudanças continuam locais, sem CI ou publicação.

## Testes adicionais da agenda — 2026-10-17

- **VERIFICADO COM SERVIÇO SIMULADO:** ausência de organização encerra carregamento, sinaliza erro e não consulta eventos; resposta bem-sucedida armazena a lista e encerra carregamento.
- **SUÍTE:** 223 testes aprovados; lint e build aprovados. O ambiente de teste alerta que variáveis Supabase não estão configuradas.
- **PRÓXIMA AÇÃO:** validar comportamento real da interface e das gravações pendentes durante troca de sessão; conciliar a branch antes de publicar.

## Navegador local sem autenticação — 2026-10-17

- **VERIFICADO:** Vite iniciado em `127.0.0.1`; Chrome headless com navegação externa bloqueada abriu `/app/eventos` sem sessão e apresentou a tela de login. O endereço permaneceu `/app/eventos`; não se observou redirecionamento de URL. O processo local foi encerrado após o teste.
- **LIMITES:** este teste não acessou dados reais nem a agenda autenticada; não comprova RLS, troca de organização, modal, gravações ou homologação. Playwright existe no runtime fornecido, mas o Chromium desse pacote está ausente; foi utilizado o Chrome instalado.
- **PRÓXIMA AÇÃO:** preparar ambiente autenticado sintético isolado para validar agenda e fluxos de sessão, sem expor credenciais nem alterar dados reais.

## Logs agregados DEV — 2026-10-17

- **CONSULTA SOMENTE LEITURA:** o projeto autorizado respondeu `ACTIVE_HEALTHY`. Na janela padrão das últimas 24 horas, PostgreSQL retornou 56 registros LOG `00000`, sete ERROR `P0001`, dois WARNING (`25P01` e `25001`) e um LOG `08006`. Não foram expostas mensagens nem informações pessoais.
- **OUTRAS FONTES:** busca textual limitada por error/fatal/panic/warning não encontrou correspondência nos 11.592 registros do pooler, 77 do PostgREST e dois do Storage; isso não comprova ausência de falhas. A classificação textual dos sete P0001 não identificou categoria específica.
- **LIMITAÇÃO:** não foi possível atribuir os sete erros a testes ou fluxos reais somente com as contagens; não há evidência suficiente para alterar código ou banco. Nenhum SQL mutável foi executado.
- **PRÓXIMA AÇÃO:** correlacionar P0001 por horário e operação com dados sintéticos e metadados minimizados, sem publicar payloads de logs ou assumir que sejam incidentes.

## Correlação de logs DEV — 2026-10-17

- **SOMENTE LEITURA:** os sete erros P0001 ocorreram às 03h UTC; seis mensagens contêm expressões compatíveis com asserções sintéticas. Os sete comandos registrados incluem expressões encontradas nos testes SQL locais, mas isso não comprova, por si só, que todos os erros tenham sido esperados ou inofensivos.
- **LIMITAÇÃO:** não foram divulgados comandos, mensagens completas ou dados pessoais. A causa exata, o resultado dos testes e qualquer impacto real continuam sem confirmação; nenhum SQL mutável foi executado.
- **PRÓXIMA AÇÃO:** correlacionar os resultados dos testes de segurança com suas execuções e validar os fluxos autenticados em ambiente sintético, preservando as restrições de RLS.

## Asserção de escrita em lideranças — 2026-10-17

- **EVIDÊNCIA EM LOG:** um dos sete P0001 corresponde à mensagem `Non-admin leader update was permitted`; o comando registrado inclui teste com papel `authenticated`, a asserção e `ROLLBACK`. O teste local contém essa asserção após tentativa de UPDATE por líder não administrador. Isso indica falha de teste registrada às 03h UTC, mas não comprova o estado atual nem exposição de dados reais; a versão exata do teste executado e a conclusão da transação não foram verificadas.
- **ESTADO ATUAL, SOMENTE LEITURA:** a política `leaders_update` exige organização correspondente e `private.nexus_is_admin()` em USING e WITH CHECK. A presença da política não comprova seu comportamento efetivo nem explica a falha histórica.
- **PENDÊNCIA DE SEGURANÇA:** conferir histórico e contexto da execução e reproduzir isoladamente sem dados reais somente quando houver ambiente apropriado; não afirmar homologação de escrita por papel com base apenas na política ou no registro anterior de sucesso. Não se executou SQL mutável nem se modificou RLS.

### Complemento da investigação

- O comando registrado contém, nesta ordem, `SET LOCAL ROLE authenticated`, o bloco `write_test`, `RESET ROLE` e `ROLLBACK`; o contexto aponta para a linha 28 do bloco, compatível com a asserção de atualização por líder. A presença desses comandos no log não comprova que todos foram executados nem a efetivação do rollback.
- Consulta atual de catálogo mostra RLS habilitada em `leaders`; `authenticated` não é superusuário, não possui BYPASSRLS e não é membro do proprietário. A função atual `private.nexus_is_admin()` consulta o perfil ativo e aceita apenas `admin` ou `superadmin`.
- O teste local de escrita é parte de alterações ainda não commitadas e não estava incluído no teste mais antigo registrado como aprovado. Persistem a divergência entre a falha observada e a configuração atual e a necessidade de reprodução isolada com captura da identidade efetiva, sem usar dados reais.
- Consulta posterior, somente leitura, encontrou zero dos IDs sintéticos explícitos do teste nas tabelas `organizations`, `auth.users` e `leaders`. Isso não comprova o rollback histórico nem verifica todas as tabelas. O histórico lista 13 migrações; seus identificadores não comprovam a data efetiva de aplicação ou a política vigente no instante da falha.

## Revisão da PR e divergência local — 2026-10-17

- **GitHub:** PR #1 aberta em rascunho no commit `6b1917997ef3a6d6d30092f3a0c6ad4242a3d31f`; branch remota está quatro commits à frente do HEAD local `e01b94e`, com alterações sobrepostas a arquivos locais já modificados. Nenhum merge, rebase, commit ou push foi realizado.
- **CI:** workflow 39057130731 terminou em `action_required`; status Vercel aponta sucesso, sem comprovar fluxos autenticados. A API não retornou revisões submetidas. A descrição da PR contém evidências antigas e precisa ser reconciliada antes da homologação, preservando seu conteúdo e o histórico.
- **PRÓXIMA AÇÃO:** conciliar os arquivos sobrepostos sem descartar modificações, validar o HEAD integrado e esclarecer a ação necessária no CI antes de publicar. Segurança de escrita por papel e E2E continuam pendentes.
- **CAUSA DO CI:** a página da execução 39057130731 informa que o workflow aguarda aprovação de um mantenedor na PR #1; a API retornou lista de jobs vazia. A aprovação não foi concedida nem foi alterada qualquer proteção. Após a aprovação, verificar o resultado efetivo dos jobs e o commit testado.

## Corrida de atualização da agenda — 2026-10-17

- **REPRODUZIDO:** uma atualização iniciada pelo callback da organização anterior após a mudança invalidava o carregamento da organização atual. Teste sintético com referências de hooks persistidas falhou antes da correção e passou depois.
- **CORREÇÃO LOCAL:** o carregamento rejeita callbacks de organização anterior após a organização atual ser confirmada no ciclo de renderização. A alteração não foi publicada.
- **LIMITES:** o teste simula hooks e serviços; não substitui navegador autenticado nem valida resultado de gravações em trânsito, mensagens e modal após troca de sessão. RLS e banco não foram alterados.
- **PRÓXIMA AÇÃO:** validar o ciclo completo de gravação/troca de sessão em ambiente sintético e conciliar as alterações locais com a branch remota antes de publicar.
- **REGRESSÃO ADICIONAL:** resposta de erro já em andamento da organização anterior podia ser exibida após a mudança, antes do efeito de limpeza. Um teste com hooks simulados falhou antes e passou depois de invalidar a requisição no efeito de layout; permanece pendente validação com React e navegador reais.
- **GRAVAÇÃO EM TRÂNSITO:** teste sintético reproduziu mensagem de sucesso de criação da organização anterior na organização seguinte; criação e atualização agora ignoram resultados e erros após troca de organização. A requisição já enviada não é cancelada e sua autorização depende do servidor. Persistem testes de edição, exclusão, estado de envio concorrente e troca de usuário na mesma organização; a correção continua local.
- **RETORNO À ORGANIZAÇÃO:** uma sequência sintética A → B → A revelou que comparar apenas IDs permitia confirmação antiga. A resposta da gravação agora também confere a geração da organização; teste falhou antes e passou depois. O ambiente usa hooks e serviço simulados, não comprova comportamento em navegador autenticado.
- **ENVIOS SOBREPOSTOS:** teste sintético mostrou que o término de uma gravação anterior liberava o estado de envio de uma gravação da organização seguinte. O estado agora é reiniciado na troca e finalizado apenas pela geração correspondente; teste falhou antes e passou depois. Falta validação com React e navegador reais.

## Revalidação do CI remoto — 2026-10-18

- **CONFIRMADO:** o relatório da conversa referenciada apontou a execução `39078664793` como concluída com sucesso no commit `19310842ec2b7d70a0d7b5895b2606224f3ff851`. A API do GitHub confirmou `success` e dois jobs concluídos: typecheck/build/testes de autenticação e validação das Edge Functions.
- **LIMITES:** o status verificado cobre o commit remoto informado, não o HEAD local com alterações não publicadas. O status Vercel associado também é sucesso, mas não substitui homologação E2E autenticada com duas organizações.
- **PENDÊNCIAS:** PR #1 continua draft; não houve merge, push, alteração de produção, banco, RLS ou permissões. A reconciliação entre branch remota e mudanças locais permanece necessária antes de qualquer publicação.

## Exportação CSV e Storage privado — 2026-10-18

- **CORRIGIDO LOCALMENTE:** a exportação de relatórios agora escapa aspas, vírgulas e quebras de linha e neutraliza prefixos de fórmula (`=`, `+`, `-`, `@`). Testes regressivos passaram; nenhum dado é enviado ao banco por essa operação.
- **VERIFICAÇÃO:** `npm test` 230/230, `npm run lint` e `npm run build` concluídos com sucesso.
- **BANCO:** o bucket `nexus-evidence-private` não existe no DEV. A tentativa de aplicar o script revisado foi recusada pelo controle de segurança por exigir aprovação específica para criação de bucket/RLS. Nenhum objeto, política ou dado foi alterado.
- **PENDÊNCIA REAL:** aprovar explicitamente o script `docs/proposed-migrations/NEXUS_PRIVATE_STORAGE_REVIEW_ONLY.sql` ou manter o Storage desativado; não habilitar uploads antes dessa decisão.

## Convites de cadastro — 2026-10-18

- **CORRIGIDO LOCALMENTE:** `URLSearchParams` já decodifica os parâmetros de convite; removida a segunda chamada de `decodeURIComponent`, que podia lançar `URIError` em valores com `%` literal.
- **VERIFICAÇÃO:** teste regressivo falhou antes da alteração e passou depois; suíte completa 232/232, lint e build concluídos com sucesso.
- **LIMITES:** não houve cadastro real, envio de convite, alteração de Auth ou banco. A correção ainda aguarda publicação na branch remota.

## Carregamento de metas — 2026-10-18

- **CORRIGIDO LOCALMENTE:** a página agora encerra o carregamento e limpa os dados quando não há organização selecionada; erros de metas ou coordenadores não são tratados como listas vazias.
- **VERIFICAÇÃO:** regressão reproduzida antes e aprovada depois; suíte completa 234/234, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; a correção aguarda publicação e homologação E2E.

## Distribuição de materiais — 2026-10-18

- **CORRIGIDO LOCALMENTE:** a tela não informa entrega concluída quando a atualização do saldo falha; agora exibe erro, recarrega o estado e interrompe a confirmação de sucesso.
- **LIMITES:** o registro da distribuição já criado pode exigir reconciliação no servidor; uma operação atômica continua pendente e requer SQL/função revisada. Nenhum SQL foi aplicado.
- **VERIFICAÇÃO:** regressão passou após falhar antes da correção; suíte 235/235, lint e build concluídos com sucesso.

## Adesivos e evidências — 2026-10-18

- **AUDITORIA:** serviços de carros e casas já exigem confirmação de linha criada, atualizada ou excluída e rejeitam referências de foto inválidas; não foi encontrada nova confirmação falsa neste módulo.
- **DECISÃO:** não foram feitas alterações redundantes. O Storage privado continua desativado até aprovação específica do script revisado.

## Carregamento de estoque — 2026-10-18

- **CORRIGIDO LOCALMENTE:** inventário, distribuições e coordenadores agora propagam erros em vez de exibir listas vazias; sem organização, o estado é limpo e o carregamento termina.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 237/237, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; a correção ainda não foi publicada na branch remota.

## Carregamento de relatórios — 2026-10-18

- **CORRIGIDO LOCALMENTE:** relatórios agora limpam dados e encerram o carregamento sem organização e propagam erros de todas as sete consultas, evitando relatório parcial apresentado como vazio.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 239/239, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; publicação e E2E continuam pendentes.

## Carregamento do modo de campo — 2026-10-18

- **CORRIGIDO LOCALMENTE:** troca ou ausência de organização agora limpa líderes, contatos, adesivos e presenças e encerra o carregamento, evitando retenção visual de dados de outro tenant.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 244/244, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; RLS continua sendo a autoridade de isolamento.

## Carregamento de presença — 2026-10-18

- **CORRIGIDO LOCALMENTE:** presença agora propaga erros de logs, eventos e reuniões; sem organização, limpa as três listas e encerra o carregamento.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 246/246, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; a alteração ainda aguarda publicação.

## Carregamento de reuniões — 2026-10-18

- **CORRIGIDO LOCALMENTE:** reuniões agora propagam o erro retornado pelo serviço; sem organização, limpam a lista e encerram o carregamento.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 248/248, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; alteração ainda não publicada.

## Dashboard e falhas parciais — 2026-10-18

- **CORRIGIDO LOCALMENTE:** quando qualquer uma das oito consultas do painel falha ou expira, a Dashboard agora exibe estado de erro visível e opção de nova tentativa, em vez de mostrar indicadores zerados como se fossem dados reais.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 251/251, lint e build concluídos com sucesso.
- **LIMITES:** logs continuam sem dados autenticados reais; publicação e E2E permanecem pendentes.

## Reconciliação da pendência RLS de perfis — 2026-10-18

- **VERIFICADO NO DEV, somente leitura:** `public.profiles` está com RLS habilitado; as policies atuais expostas são `profile_read` e `profile_update_own_contact`. Não foi encontrada policy INSERT na consulta atual, embora o papel `authenticated` ainda possua privilégio de tabela INSERT.
- **DIVERGÊNCIA:** a descrição da PR #1 menciona uma antiga policy de inserção própria e risco de alteração de `role`/`organization_id`; essa descrição não prova que a policy ainda exista. A configuração atual precisa ser tratada como fonte de verdade.
- **DECISÃO:** não aplicar SQL com base na descrição antiga. Qualquer ajuste de privilégios ou RLS exige script específico, revisão e aprovação; nenhum banco foi alterado.

## Estado remoto da PR — 2026-10-18

- **VERIFICADO:** PR #1 continua aberta, draft e não mesclada, mas a branch remota está no head `4ecc5161dd115909b8a6f7db6e3f784e3ab16053`, com 150 commits e 101 arquivos; o checkout local permanece em `e01b94e` com alterações não publicadas.
- **CI:** a execução `39080394393` do head remoto terminou `action_required`; não tratar o CI como aprovado sem autorização do mantenedor e jobs concluídos.
- **RISCO:** não é seguro reconciliar automaticamente esse volume com o working tree sujo. Nenhum reset, rebase, force-push ou merge foi realizado.

## Executor horário remoto — 2026-10-18

- **VERIFICADO:** o repositório contém um workflow horário `autonomous-nexus.yml`, mas ele só executa quando `NEXUS_AUTONOMY_ENABLED=true` e o segredo `OPENAI_API_KEY` existe; sem ambos, o job é pulado.
- **LIMITAÇÃO:** não é possível confirmar nem configurar segredos/variáveis pelo checkout ou por este ciclo. Não há evidência de execução autônoma ativa contínua.
- **SEGURANÇA:** o workflow remoto declara que não aplica migrações, não acessa produção e não faz merge; não alterei o workflow.

## Carregamento de inteligência territorial — 2026-10-18

- **CORRIGIDO LOCALMENTE:** demandas, contatos e lideranças agora limpam o estado sem organização e propagam erros individuais das consultas.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 250/250, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; alteração ainda não publicada.

## Carregamento do CRM — 2026-10-18

- **CORRIGIDO LOCALMENTE:** CRM agora limpa contatos e lideranças e encerra o carregamento sem organização; erros de ambas as consultas deixam de ser tratados como listas vazias.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 243/243, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; publicação e E2E continuam pendentes.

## Carregamento de coordenação — 2026-10-18

- **CORRIGIDO LOCALMENTE:** a tela agora limpa coordenadores e líderes e encerra o carregamento sem organização; erros de ambas as consultas são propagados em vez de tratados como listas vazias.
- **VERIFICAÇÃO:** regressão passou após falhar antes; suíte 241/241, lint e build concluídos com sucesso.
- **LIMITES:** sem consulta autenticada real; publicação e E2E continuam pendentes.
## Leaders/Stickers — 2026-10-18

- Corrigido tratamento de falhas de carregamento em `LeadersPage.tsx` e `StickersPage.tsx`: erros retornados por serviços agora interrompem o fluxo e são exibidos, em vez de serem tratados como listas vazias.
- Ao perder a organização ativa, os estados dessas telas são limpos e o carregamento é encerrado.
- Validação: `npm test` — 253/253; `npm run lint` — aprovado; `npm run build` — aprovado.
## Users — 2026-10-18

- Corrigido `UsersPage.tsx` para limpar membros e encerrar o carregamento quando não existe organização ativa.
- O tratamento de erro da consulta de membros já estava presente e foi preservado.
- Validação: `npm test` — 254/254; `npm run lint` — aprovado; `npm run build` — aprovado.
## Profiles — 2026-10-18

- Corrigido `profilesService.create`: INSERT sem linha retornada agora retorna `PROFILE_CREATE_NOT_CONFIRMED`, evitando sucesso falso no cadastro inicial.
- Validação: `npm test` — 255/255; `npm run lint` — aprovado; `npm run build` — aprovado.
## Modal acessível e Storage privado — 2026-10-18

- Corrigido `Modal.tsx` com `role=dialog`, nome/descrição acessíveis, `aria-modal`, foco inicial, armadilha de Tab/Shift+Tab, Escape e restauração do foco ao fechar.
- Adicionados 2 testes de regressão de acessibilidade.
- SQL aprovado pelo usuário e aplicado exclusivamente no Supabase DEV `qidstqsbxwkbkwowhpab`: bucket `nexus-evidence-private` privado, limite 5 MiB, MIME JPG/PNG/WebP, políticas SELECT/INSERT/DELETE tenant-scoped e sem UPDATE.
- Verificação pós-aplicação confirmou o bucket e as três políticas. Nenhuma produção foi alterada.

## Ciclo autônomo — 2026-10-17: refresh de sessão obsoleto

- **Tarefa única concluída:** impedir que `refreshUserData` aplique uma sessão recuperada antes de logout/troca de identidade ou publique erro/finalização de uma carga invalidada.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `e01b94e`; status e diff inicialmente limpos. Lidos este documento primeiro, `OBRAMAXAUTO.md`, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA continuam ausentes; evidências concentradas aqui.
- **Causa reproduzida:** o refresh sem usuário aguardava `getSession` sem verificar invalidação antes de restaurar usuário/sessão e iniciar carga de perfil. Rejeições antigas também publicavam erro depois de eventos mais recentes.
- **Correção:** `src/contexts/AuthContext.tsx` usa a geração existente para descartar o snapshot obsoleto e proteger erro/finalização. Após iniciar sua própria carga protegida, acompanha a geração dessa carga. Nenhuma requisição enviada é cancelada.
- **REPROVADO (RED esperado, resolvido):** `node tests/auth-profile-loading.test.mjs` antes da correção: 23 casos, 19 aprovados e 4 falhas (sessão tardia após SIGNED_OUT/SIGNED_IN e rejeição tardia após ambos). O log foi capturado em `/tmp/nexus-refresh-red.log`; o comando Node falhou, embora o comando shell de captura terminasse com o sucesso de `tail`.
- **APROVADO:** execução final de `node tests/auth-profile-loading.test.mjs`, saída 0, 23 casos. Sete casos novos usam promessas controladas para sessão/erro/rejeição tardios após SIGNED_OUT/SIGNED_IN e recuperação normal sem evento posterior. Hooks e serviços simulados executam callbacks reais; sem rede, credenciais ou dados reais.
- **REPROVADO:** `npm test`, saída 1: 14 de 15 arquivos aprovados. Falha em `tests/organization-update-confirmation.test.mjs`, caso `zero-row organization update must not report success`: esperado `ORGANIZATION_UPDATE_NOT_APPLIED`, recebido `undefined`. Reprodução isolada com `node tests/organization-update-confirmation.test.mjs`, saída 1 (2 casos aprovados, 1 reprovado). Serviço e teste de organizações não têm diff contra HEAD e não importam AuthContext; falha existente fora da tarefa escolhida, preservada para próximo ciclo.
- **APROVADO:** `npm run lint`, saída 0; `npm run build`, saída 0 (Vite 6.4.4, 2172 módulos, sem aviso de chunk acima de 500 kB); `git diff --check`, saída 0. Aviso ambiental: NO_COLOR ignorado por FORCE_COLOR.
- **NÃO VERIFICADO:** navegador/SDK reais, RLS multitenant e convite E2E. Os mocks não simulam rerender completo nem todas as intercalações de signIn/signUp/refresh. Não declarar autenticação integralmente homologada.
- **Limites/bloqueios:** sem bloqueio para a correção local; suíte global permanece reprovada pela atualização de organizações. Somente AuthContext, seu teste e este registro alterados; sem SQL, banco, migração, workflow, ambiente, segredo, merge ou deploy. Nenhuma mudança humana sobrescrita.
- **Próxima ação:** corrigir em ciclo separado a falha já reproduzida de confirmação de atualização em `organizationsService.update`, preservando erros do Supabase e exigindo linha retornada. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: confirmação de atualização de organização

- **Tarefa única concluída:** `organizationsService.update` agora retorna `ORGANIZATION_UPDATE_NOT_APPLIED` quando Supabase responde sem erro e sem linha. Retornos com linha e erros originais são preservados. Isso impede confirmação falsa nos consumidores que verificam `error`, incluindo Configurações e Planos.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `0ca3296`, status e diff limpos. Lidos este documento primeiro, OBRAMAXAUTO, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA ausentes; evidências concentradas aqui.
- **REPROVADO (RED esperado, resolvido):** `node tests/organization-update-confirmation.test.mjs`, saída 1: dois casos aprovados e zero linhas reprovado, recebendo erro indefinido. Causa: retorno direto de `maybeSingle()` sem exigir linha confirmada.
- **APROVADO:** após correção, mesmo comando com saída 0, três casos (zero linhas, linha confirmada, preservação de erro Supabase). Teste existente executa serviço real com fronteira Supabase simulada e dados sintéticos, sem rede.
- **APROVADO:** `npm test`, saída 0 (15 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0 (Vite 6.4.4, 2172 módulos, sem alerta de chunk acima de 500 kB). Aviso ambiental: NO_COLOR ignorado por FORCE_COLOR.
- **REPROVADO (intermediário, resolvido):** primeira verificação `git diff --check` detectou CRLF nas linhas inseridas; ajustadas somente essas linhas para LF, preservando o restante do arquivo.
- **NÃO VERIFICADO:** navegador, persistência real e isolamento RLS multitenant. Sem bloqueio para tarefa local; homologação integral continua pendente. Nenhum SQL, banco, migração, workflow, segredo, ambiente, merge ou deploy alterado; somente serviço e este registro, sem sobrescrever mudanças humanas.
- **Próxima ação:** reproduzir em teste isolado o tratamento de erro em `OnboardingPage.handleFinish`: chamadas de atualização de organização e criação de coordenador atualmente não inspecionam o `error` retornado. Corrigir em ciclo separado se confirmada conclusão falsa. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: erros de persistência no onboarding

- **Tarefa única concluída:** impedir conclusão falsa em `OnboardingPage.handleFinish` quando atualização de organização ou criação opcional de coordenador retorna erro, ou quando não existe organização carregada. Erros seguem para o toast existente, sem sucesso/navegação; falha da atualização impede a criação subsequente e o carregamento sempre termina.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `113cfd8`, status e diff inicialmente limpos. Lidos este documento primeiro, OBRAMAXAUTO, auditoria técnica e skills `bug-hunter` / `qa-automation`. ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA raiz continuam ausentes; registro mantido aqui.
- **Causa confirmada:** os serviços retornam `{ data, error }`, mas o handler apenas aguardava suas promessas. Sem organização, pulava todas as escritas e também anunciava sucesso.
- **REPROVADO (RED esperado, resolvido):** `node tests/onboarding-completion.test.mjs`, saída 1: três casos novos de falha produziram toast de sucesso indevido; os dois casos de sucesso passaram.
- **APROVADO:** após correção, `node tests/onboarding-completion.test.mjs`, saída 0, cinco casos. Testes executam o handler real do componente com hooks, serviços, toasts e navegação simulados; cobrem erros retornados nas duas operações, organização ausente, sucesso completo e coordenador opcional vazio, incluindo encerramento do carregamento. Somente dados sintéticos, sem rede ou banco.
- **APROVADO:** `npm test`, saída 0 (16 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0 (Vite 6.4.4, 2172 módulos). Aviso ambiental sem falha: NO_COLOR ignorado por FORCE_COLOR.
- **NÃO VERIFICADO:** navegador, persistência real e RLS multitenant. Os testes não simulam rerender completo. As duas escritas continuam independentes: falha na criação não desfaz atualização de organização já concluída. Não há homologação integral do onboarding.
- **Limites/bloqueios:** sem bloqueio local; somente componente, teste e este documento alterados. Nenhum SQL, banco, migração, workflow, segredo, ambiente, merge ou deploy; nenhuma mudança humana sobrescrita.
- **Próxima ação:** investigar separadamente o retorno sem linha e sem erro de `coordinatorsService.create`, que utiliza `maybeSingle`; reproduzir antes de corrigir confirmação de inserção. E2E com identidades de teste permanece pendente. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: confirmação de criação de coordenador

- **Tarefa única concluída:** `coordinatorsService.create` agora retorna `COORDINATOR_CREATE_NOT_CONFIRMED` quando recebe `data=null,error=null`. Isso impede conclusão falsa no onboarding e apresenta erro no cadastro de coordenadores. Linha confirmada e erro original do Supabase são preservados; a mensagem orienta conferir a lista antes de repetir, pois ausência de retorno não prova ausência de persistência.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `5adbe7f`, status e diff limpos. Lidos este documento primeiro, OBRAMAXAUTO, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA continuam ausentes; evidências registradas aqui.
- **REPROVADO (RED esperado, resolvido):** `node tests/coordinator-create-confirmation.test.mjs`, saída 1: dois casos aprovados e um reprovado; ausência de linha retornava erro indefinido. Causa: retorno direto de `maybeSingle()` sem confirmar a linha.
- **APROVADO:** após correção, mesmo comando, saída 0, três casos: ausência de linha, sucesso com linha e preservação de erro Supabase. Serviço real executado com fronteira Supabase simulada e dados sintéticos, sem rede/banco.
- **APROVADO:** `npm test`, saída 0 (17 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0 (Vite 6.4.4, 2172 módulos); `git diff --check`, saída 0. Logs locais em `/tmp/nexus-cycle-tests.log`, `/tmp/nexus-cycle-lint.log`, `/tmp/nexus-cycle-build.log`. Aviso ambiental sem falha: NO_COLOR ignorado por FORCE_COLOR.
- **NÃO VERIFICADO:** navegador, persistência real, RLS multitenant e convite E2E. O mock comprova o tratamento da resposta, não que INSERT sob RLS produza esse retorno no ambiente real. As escritas do onboarding continuam independentes, sem rollback automático.
- **Limites/bloqueios:** sem bloqueio local. Somente serviço, teste novo e este documento alterados neste checkout/branch. Sem SQL, banco, migração, workflow, segredo, ambiente, merge ou deploy; nenhuma mudança humana sobrescrita.
- **Próxima ação:** investigar separadamente o tratamento de retorno sem linha em `leadersService.create` e seus consumidores; reproduzir impacto antes de corrigir. E2E permanece pendente de ambiente com identidades controladas. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: retorno não confirmado no cadastro de liderança

- **Tarefa única concluída:** `leadersService.create` retorna `LEADER_CREATE_NOT_CONFIRMED` quando recebe `data=null,error=null`. O consumidor `LeadersPage` já trata `error` com toast; antes, esse retorno deixava o cadastro sem confirmação nem explicação. Sucesso com linha e erro original do Supabase são preservados. A mensagem orienta conferir a lista antes de repetir, pois ausência de retorno não prova ausência de persistência.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `6b19179`, status e diff inicialmente limpos. Lidos este documento primeiro, AGENTS, OBRAMAXAUTO, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA continuam ausentes; registro mantido aqui.
- **REPROVADO (RED esperado, resolvido):** `node tests/leader-create-confirmation.test.mjs`, saída 1: dois casos aprovados e um reprovado; resposta sem linha não retornava o erro esperado. Causa: retorno direto de `maybeSingle()` sem confirmar a linha.
- **APROVADO:** após correção, mesmo comando, saída 0, três casos: ausência de linha, sucesso com linha e preservação do erro Supabase. Serviço real executado com fronteira Supabase simulada e dados sintéticos, sem rede ou banco.
- **APROVADO:** `npm test`, saída 0 (18 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0; `git diff --check`, saída 0. Logs locais em `/tmp/nexus-leader-tests.log`, `/tmp/nexus-leader-lint.log` e `/tmp/nexus-leader-build.log`. Aviso ambiental sem falha: NO_COLOR ignorado por FORCE_COLOR.
- **NÃO VERIFICADO:** navegador, persistência real, RLS multitenant e convite E2E. O mock comprova tratamento da resposta, não que INSERT sob RLS produza esse retorno no ambiente real. Não há homologação integral do cadastro.
- **Limites/bloqueios:** sem bloqueio para tarefa local. Somente `src/services/dataServices.ts`, `tests/leader-create-confirmation.test.mjs` e este documento alterados; sem SQL, banco, migração, workflow, ambiente, segredo, merge ou deploy. Nenhuma alteração humana sobrescrita.
- **Próxima ação:** validar em ambiente isolado com identidades sintéticas o cadastro de liderança (sucesso e negação por RLS), incluindo mensagem e manutenção do formulário em caso de erro. E2E autenticado permanece pendente de ambiente com identidades controladas. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-17: erro retornado na recuperação de sessão

- **Tarefa única concluída:** `refreshUserData` inspeciona o `error` retornado por `supabase.auth.getSession`, após verificar se a carga ainda é atual. A falha agora preenche `initializationError` e encerra o carregamento, sem restaurar sessão ou consultar perfil a partir da resposta com erro. Erros obsoletos continuam descartados.
- **Inspeção:** branch atual `fix/persist-rbac-permissions`, HEAD inicial `1931084`, status e diff inicialmente limpos. Lidos este documento primeiro, AGENTS, OBRAMAXAUTO, auditoria técnica e skills `bug-hunter` / `qa-automation`. Documentos raiz ESCOPO/BACKLOG/ESTADO/TESTES/AUDITORIA ausentes; evidências concentradas aqui.
- **Causa confirmada:** o refresh extraía apenas `data`; um erro retornado sem rejeição era ignorado, deixando a tentativa sem explicação. A tarefa E2E anterior permanece dependente de ambiente com identidades controladas; nenhuma conexão externa foi realizada.
- **REPROVADO (RED esperado, resolvido):** `node tests/auth-profile-loading.test.mjs`, saída 1: 23 casos aprovados e dois novos reprovados por `initializationError=null`. Log em `/tmp/nexus-session-error-red.log`.
- **APROVADO:** mesmo comando após correção, saída 0, 25 casos. Dois novos casos exercitam erro retornado com sessão ausente e com sessão presente, exigindo mensagem, encerramento do carregamento e ausência de consultas de perfil/restauração de acesso. O segundo é defesa de contrato; não afirma que o SDK real devolve essa combinação. Hooks e fronteiras simulados, dados sintéticos, sem rede. Log em `/tmp/nexus-session-error-green.log`.
- **APROVADO:** `npm test`, saída 0 (19 arquivos); `npm run lint`, saída 0; `npm run build`, saída 0. Logs em `/tmp/nexus-session-error-tests.log`, `/tmp/nexus-session-error-lint.log` e `/tmp/nexus-session-error-build.log`. Aviso ambiental sem falha: NO_COLOR ignorado por FORCE_COLOR.
- **NÃO VERIFICADO:** navegador, SDK real, RLS multitenant e convite E2E. Mocks não simulam rerender completo. Sem bloqueio para a correção local; E2E continua pendente de ambiente com identidades sintéticas.
- **Limites:** somente AuthContext, teste de carregamento e este registro alterados, sem sobrescrever mudanças humanas. Sem SQL, banco, migração, workflow, ambiente, segredo, merge ou deploy.
- **Próxima ação:** investigar em ciclo separado a finalização de callbacks concorrentes de `onAuthStateChange`: verificar se uma carga antiga encerra `isLoading` enquanto uma identidade mais recente ainda carrega; reproduzir com promessas controladas antes de corrigir. Estado: EM DESENVOLVIMENTO.

## Ciclo autônomo — 2026-10-18: verificação pós-publicação

- **APROVADO:** branch `fix/persist-rbac-permissions` sincronizada no commit `b8d520a95765bba7990f662945a097eb219471bd`.
- **APROVADO:** checks remotos do PR: typecheck/build, validação de Edge Functions, GitGuardian sem segredos detectados e preview Vercel concluído com sucesso.
- **NÃO VERIFICADO:** E2E autenticado com dois tenants; advisories de funções privilegiadas, Auth e índices permanecem sem alteração por exigirem revisão/autorização específica.
- **Próxima ação:** executar somente auditoria direcionada de logs/fluxos autenticados quando houver ambiente de teste controlado; não aplicar SQL estrutural sem aprovação específica.

## Ciclo autônomo — 2026-10-18: auditoria de logs DEV

- **APROVADO:** consulta read-only na janela padrão de 24 horas do Supabase DEV não encontrou eventos `error:`, `fatal:` ou `panic`.
- **OBSERVAÇÃO:** os eventos disponíveis foram principalmente inicialização/recarregamento de cache do PostgREST; não há evidência de tráfego autenticado suficiente para declarar E2E homologado.
- **SEGURANÇA:** um log continha texto de script SQL histórico. Foi tratado somente como dado não confiável; nenhuma instrução nele foi executada.
- **Próxima ação:** manter a pendência de E2E autenticado e revisar advisories somente com autorização específica.

## Ciclo autônomo — 2026-10-18: CI e advisories pós-publicação

- **APROVADO:** checks do commit `bc559e51edc66b8ffdb78b621366b7d69a1b9f16` concluídos com sucesso: build/typecheck, Edge Functions, GitGuardian e Vercel.
- **REVISADO:** advisories do DEV continuam iguais: 2 tabelas privadas com RLS sem policy, 3 funções SECURITY DEFINER executáveis por `authenticated`, proteção de senhas comprometidas desativada, 2 FKs privadas sem índice cobridor e 12 índices não usados.
- **DECISÃO:** nenhum advisory foi alterado, pois as correções exigem revisão e aprovação específica de SQL/Auth; índices não usados não justificam remoção sem dados de carga.
- **Próxima ação:** homologação E2E autenticada com identidades sintéticas e dois tenants.

## Ciclo autônomo — 2026-10-18: preparação de E2E autenticado

- **APROVADO:** o script `scripts/e2e/tenant-auth-readonly.mjs` exige explicitamente DEV autorizado, valida o projeto `qidstqsbxwkbkwowhpab`, usa duas contas distintas e executa somente leituras/saída de sessão.
- **BLOQUEADO EXTERNO:** a execução local parou antes de qualquer rede por ausência de autorização explícita e das variáveis de duas contas de teste em organizações diferentes.
- **SEGURANÇA:** nenhum segredo foi solicitado, impresso, criado ou persistido; não houve alteração no banco.
- **Próxima ação:** executar o script somente quando o responsável fornecer ambiente/contas TEST controladas e autorização explícita para esse smoke test DEV.

## Ciclo autônomo — 2026-10-18: auditoria estática dos serviços

- **APROVADO:** consultas de listagem dos módulos operacionais recebem `organizationId` e filtram `organization_id` antes de renderização.
- **APROVADO:** operações por ID permanecem centralizadas nos serviços e dependem das políticas RLS; não foi encontrada chamada client-side direta ao Supabase fora dessa camada.
- **RESULTADO:** nenhuma falha nova comprovada e nenhuma alteração de código necessária nesta rodada.
- **Próxima ação:** aguardar ambiente controlado para E2E autenticado; manter SQL/Auth advisories sob aprovação específica.

## Ciclo autônomo — 2026-10-18: fechamento dos checks remotos

- **APROVADO:** checks do commit `5c94744b385591ce45320ecf25d81022cf3a9d66` concluídos com sucesso em typecheck/build, Edge Functions, GitGuardian e Vercel.
- **APROVADO:** nenhuma annotation de falha foi reportada pelos checks.
- **PENDENTE:** E2E autenticado permanece dependente de duas contas TEST controladas; advisories estruturais continuam sob aprovação específica.

## Ciclo autônomo — 2026-10-18: confirmação de privilégios no DEV

- **CONFIRMADO (somente leitura):** `authenticated` possui `EXECUTE` em `nexus_set_controller_scope`, `nexus_set_team_scope` e `provision_new_user`, todas `SECURITY DEFINER`.
- **CONFIRMADO (somente leitura):** `authenticated` possui privilégios DML amplos em `public.organizations`, `public.profiles` e `public.user_module_permissions`; RLS não substitui a necessidade de revisar `TRUNCATE`, `TRIGGER` e contratos privilegiados.
- **DECISÃO:** nenhuma revogação foi aplicada. A correção depende de definir quais chamadas são necessárias ao onboarding e de aprovação específica do script SQL/Auth.
- **Próxima ação:** apresentar script mínimo de revogação e testes negativos somente após autorização explícita para esta mudança estrutural.

## Ciclo autônomo — 2026-10-18: refinamento de privilégios

- **APROVADO (somente leitura):** `has_table_privilege` confirmou que `authenticated` não possui `TRUNCATE`, `TRIGGER` ou `REFERENCES` em `organizations`, `profiles` e `user_module_permissions`.
- **APROVADO (somente leitura):** `profiles` não concede `UPDATE` a `authenticated`; isso mantém a alteração de perfil sob fluxo controlado.
- **REVISÃO:** as funções `SECURITY DEFINER` são RPCs usadas pelo frontend e suas implementações validam administrador ativo, tenant, papel e vínculos antes de escrever. O advisory permanece documentado, mas não prova vulnerabilidade isoladamente.
- **Decisão:** não aplicar revogações automáticas; qualquer mudança de contrato exige teste de onboarding/RBAC e aprovação específica.

## Ciclo autônomo — 2026-10-18: reconciliação de migrations DEV

- **CONFIRMADO (somente leitura):** o Supabase DEV registra 14 migrations; o checkout versiona 10 arquivos.
- **DIVERGÊNCIA IDENTIFICADA:** faltam no checkout `20261016152053_restrict_rls_event_trigger_execution`, `20261016153154_nexus_core_organizations_profiles_permissions`, `20261016175917_provision_new_user`, `20261016182406_nexus_operational_modules_tenant_scoped`, `20261016182434_index_nexus_operational_foreign_keys`, `20261017002453_nexus_module_read_rls` e `20261018012432_nexus_private_storage_reviewed` (esta última está descrita em `docs/proposed-migrations`).
- **DECISÃO:** não reconstruir nem aplicar arquivos SQL automaticamente. Os cinco primeiros contêm DDL/RLS/funções privilegiadas; a reconciliação precisa de revisão e aprovação específica para evitar reexecução ou divergência de schema.
- **CI:** a consulta de checks do PR retornou HTTP 409 porque o PR mudou; não foi possível declarar estado novo sem recarregar a revisão atual.
- **Próxima ação:** apresentar um patch de versionamento/reconciliação para aprovação, sem executar SQL no DEV.

## Ciclo autônomo — 2026-10-18: manutenção do CI

- **CORRIGIDO:** atualizados `actions/checkout` e `actions/setup-node` de `@v4` para `@v5` em `ci.yml` e no workflow E2E manual, removendo o aviso de runtime Node 20 depreciado emitido pelo GitHub.
- **VALIDADO:** `npm test` passou com 198/198; `npm run lint` passou; `npm run build` passou.
- **REMOTO:** os checks do commit `3f5bf1e` estavam verdes; as anotações eram apenas aviso de depreciação Node 20 e notice de migração do Ubuntu, sem falha funcional.
- **PENDENTE:** os checks do novo commit ainda precisam concluir; E2E autenticado permanece manual e dependente de duas contas sintéticas DEV.

## Ciclo autônomo — 2026-10-18: estabilidade do runner

- **CORRIGIDO:** fixado `runs-on` em `ubuntu-24.04` nos workflows CI e E2E manual para evitar a migração automática anunciada para Ubuntu 26.
- **VALIDADO:** checks remotos anteriores permaneceram funcionais; o aviso era operacional, sem falha de código.

## Ciclo autônomo — 2026-10-18: revalidação DEV pós-CI

- **CONFIRMADO:** advisories de segurança e performance permanecem iguais: 2 tabelas privadas sem policy, 3 RPCs `SECURITY DEFINER` expostas, proteção contra senha vazada desativada, 2 FKs privadas sem índice e 12 índices não usados.
- **DECISÃO:** nenhum ajuste automático; os itens estruturais exigem script revisado, teste de impacto e aprovação específica.
- **CI:** Vercel e GitGuardian do commit `0fdbd56` aprovados; typecheck/build e Edge Functions ainda estavam em execução no momento da consulta.

## Ciclo autônomo — 2026-10-18: auditoria estática de exposição

- **APROVADO:** a busca direcionada não encontrou chave `service_role`, segredo Supabase ou `dangerouslySetInnerHTML` no frontend; a chave administrativa aparece somente na Edge Function via variável de ambiente.
- **APROVADO:** o uso de `localStorage` permanece restrito à persistência da sessão Supabase; nenhuma persistência de `organization_id` foi encontrada.
- **PENDENTE:** checks do commit `c368093` ainda estavam em execução na última consulta; nenhuma falha nova comprovada.

## Ciclo autônomo — 2026-10-18: CI fechado

- **APROVADO:** no commit `7c31bfb`, Vercel Preview, GitGuardian, typecheck/build e validação das Edge Functions concluíram com sucesso.
- **RESULTADO:** nenhuma annotation de falha ou segredo detectado; branch de desenvolvimento permanece sincronizada e sem merge em produção.

## Ciclo autônomo — 2026-10-18: logs pós-CI

- **CONFIRMADO:** a consulta de fontes do log DEV retornou `pgbouncer_logs`, `postgres_logs` e `postgrest_logs`.
- **BLOQUEIO TÉCNICO:** a consulta agregada de erros e a leitura de campos detalhados retornaram erro do backend/coluna inexistente do conector; não tratei isso como ausência de erros e não repeti a mesma consulta.
- **REFERÊNCIA:** a última auditoria válida anterior não encontrou `error:`, `fatal:` ou `panic`; é necessária uma janela posterior com esquema de campos confirmado para nova conclusão.

## Ciclo autônomo — 2026-10-18: auditoria de logs corrigida

- **APROVADO:** com o campo correto `event_message`, a busca em `postgres_logs` e `postgrest_logs` retornou zero eventos contendo `error`, `fatal` ou `panic`.
- **CONTEXTO:** mensagens históricas sobre `bucket_id`, `rowsecurity` e transação já em andamento correspondem a consultas/execuções de auditoria anteriores, não a falhas do frontend em produção; não foram tratadas como instruções.

## Ciclo autônomo — 2026-10-18: validação final do commit

- **APROVADO:** commit `e0e985a` com Vercel, GitGuardian, typecheck/build e Edge Functions concluídos com sucesso.
- **RESULTADO:** nenhum segredo detectado, nenhuma annotation de falha e nenhum deploy em produção.

## Ciclo autônomo — 2026-10-18: plano de reconciliação estrutural

- **PREPARADO:** `docs/proposed-migrations/MIGRATION_RECONCILIATION_PLAN.md` lista as 7 migrations DEV ausentes, o procedimento seguro e os limites de aprovação.
- **LIMITE:** nenhum arquivo SQL executável foi criado e nenhuma migration foi aplicada; os itens com DDL/RLS/funções privilegiadas aguardam aprovação específica.

## Ciclo autônomo — 2026-10-18: instalação determinística

- **MELHORIA:** workflows CI e E2E passaram de `npm install` para `npm ci`, usando o `package-lock.json` existente.
- **VALIDADO:** `npm ci --dry-run --ignore-scripts --no-audit --no-fund` concluiu com sucesso localmente.

## Ciclo autônomo — 2026-10-18: correção pendente no Storage DEV

- **REPROVADO:** auditoria horária confirmou que as policies `nexus_private_evidence_select`, `nexus_private_evidence_insert` e `nexus_private_evidence_delete` usam regex com barra duplicada antes da extensão e rejeitam caminhos JPG válidos.
- **PREPARADO:** `docs/proposed-migrations/FIX_PRIVATE_STORAGE_POLICY_REGEX.sql` recria somente essas três policies com `\\.` correto, preservando bucket privado, isolamento por organização e ausência de UPDATE.
- **BLOQUEADO:** não executei o script; DROP/CREATE de RLS exige aprovação específica. Nenhum dado, bucket ou produção foi alterado.

## Ciclo autônomo — 2026-10-18: Storage DEV corrigido após autorização

- **APLICADO:** `fix_private_storage_policy_regex` exclusivamente no Supabase DEV `qidstqsbxwkbkwowhpab`, recriando as três policies autorizadas.
- **VERIFICADO:** regex corrigida aceita JPG sintético válido; regex legada rejeita. As policies mantêm SELECT/INSERT/DELETE tenant-scoped e não criam UPDATE.
- **LIMITE:** nenhuma alteração em produção, dados ou outras policies; homologação E2E ainda pendente.

## Ciclo autônomo — 2026-10-18: rotas administrativas sem gate explícito

- **CORRIGIDO:** `/app/onboarding` e `/app/planos` agora exigem perfil `admin` ou `superadmin` antes da renderização; usuários bloqueados e demais papéis recebem a tela 403.
- **TESTADO:** adicionados testes de regressão para os dois caminhos e para rotas privadas comuns. Suíte executada com **200/200**; `npm run lint` e `npm run build` concluídos com sucesso.
- **LIMITE:** a proteção de rota é somente uma camada de interface; RLS continua sendo a barreira definitiva. Storage/RLS e E2E autenticado permanecem pendentes.
- **MELHORIA:** o Sidebar também oculta “Planos & Assinatura” de perfis que não sejam `admin`/`superadmin`, evitando anunciar uma rota sem autorização.

## Ciclo autônomo — 2026-10-18: bootstrap do novo Supabase DEV

- **APLICADO:** o projeto DEV `qwvbvqlzcyfkuszxrlgv` recebeu o schema NEXUS, funções auxiliares, RLS, hierarquia e policies de Storage privado, sem copiar dados reais.
- **VERIFICADO:** 16 tabelas públicas, todas com RLS; bucket privado `nexus-evidence-private` com limite de 5 MiB e MIME restrito; policies SELECT/INSERT/DELETE, sem UPDATE.
- **ATUALIZADO:** o script E2E agora exige o projeto `qwvbvqlzcyfkuszxrlgv`.
- **PENDENTE:** o novo projeto ainda não possui usuários Auth; é necessário criar duas contas sintéticas em organizações distintas antes da homologação E2E.

## Ciclo autônomo — 2026-10-18: Preview reconectado ao Supabase atual

- **CORRIGIDO:** as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do Preview da branch `fix/persist-rbac-permissions` foram atualizadas para `qwvbvqlzcyfkuszxrlgv`.
- **VERIFICADO:** novo deployment Vercel READY no commit `eac6acc`; o bundle publicado contém a URL nova e não contém a URL antiga.
- **LIMITE:** produção não foi alterada; homologação E2E continua pendente até existirem duas contas Auth sintéticas no novo DEV.

## Ciclo autônomo — 2026-10-18: índices de integridade referencial

- **APLICADO:** migration `nexus_foreign_key_indexes` no DEV novo, cobrindo FKs tenant-scoped e hierárquicas sem alterar dados ou políticas.
- **VERIFICADO:** advisor deixou de apontar `unindexed_foreign_keys`; os avisos restantes são índices ainda não usados por falta de carga e duas combinações de policies permissivas já existentes.

## Ciclo autônomo — 2026-10-18: isolamento do Dashboard

- **CORRIGIDO:** `DashboardPage` agora descarta respostas de consultas paralelas iniciadas para uma organização anterior e limpa os dados ao perder a organização selecionada.
- **VERIFICADO:** 217/217 testes, lint, build local e checks da PR (typecheck/build, Edge Functions, Vercel e GitGuardian) aprovados. Commit `a53fdcf` publicado na branch de desenvolvimento.

## Ciclo autônomo — 2026-10-18: isolamento da tela de organizações

- **CORRIGIDO:** `OrganizationsPage` agora descarta respostas de uma carga iniciada antes da troca de organização e não altera loading/erros com respostas obsoletas.
- **VERIFICADO:** 218/218 testes, lint e build aprovados localmente; publicação segue somente na branch de desenvolvimento.

## Ciclo autônomo — 2026-10-18: isolamento do modo de campo

- **CORRIGIDO:** `FieldPage` agora descarta respostas e erros de consultas paralelas iniciadas para uma organização anterior, protegendo também o estado de carregamento e as seleções de liderança.
- **VERIFICADO:** 219/219 testes, lint e build aprovados localmente; produção e `main` não foram alterados.

## Ciclo autônomo — 2026-10-18: prontidão do cadastro por convite

- **CORRIGIDO:** `RegisterPage` não aceita submissão antes de terminar a resolução dos parâmetros do convite; isso impede criar conta comum ou associar o usuário ao tenant errado durante a corrida de carregamento.
- **VERIFICADO:** 220/220 testes, lint e build aprovados localmente. Nenhuma alteração em produção ou no banco foi feita.

## Ciclo autônomo — 2026-10-18: provisionamento seguro de convites

- **CORRIGIDO:** o cadastro autenticado de um convite válido não executa mais a RPC de criação de tenant; convites inválidos são rejeitados antes da autenticação.
- **VERIFICADO:** 221/221 testes, lint e build aprovados localmente. Nenhum dado, schema ou ambiente de produção foi alterado.

## Ciclo autônomo — 2026-10-18: validação completa de convites

- **MELHORADO:** convites com liderança ou coordenação inválida agora falham antes da criação da conta, evitando provisionamento parcial.
- **VERIFICADO:** 221/221 testes, lint e build aprovados localmente.

## Ciclo autônomo — 2026-10-18: consistência do convite

- **CORRIGIDO:** a Edge Function agora desfaz o usuário Auth quando não consegue persistir o perfil, evitando contas órfãs e convites impossíveis de repetir.
- **VERIFICADO:** 222/222 testes, lint e build aprovados localmente; a validação da Edge Function também passou no CI.
