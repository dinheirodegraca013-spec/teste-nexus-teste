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
