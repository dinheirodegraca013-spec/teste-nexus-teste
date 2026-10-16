# NEXUS — Estado de desenvolvimento autônomo

Última atualização: 2026-10-16

## Estado geral

- Estado: EM DESENVOLVIMENTO
- Aprovação final: NÃO CONCEDIDA
- Repositório: `dinheirodegraca013-spec/teste-nexus-teste`
- Branch de trabalho: `fix/persist-rbac-permissions`
- PR principal: #1 — https://github.com/dinheirodegraca013-spec/teste-nexus-teste/pull/1
- Supabase: projeto `wrovgjhpyacmmetejiqk`
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
