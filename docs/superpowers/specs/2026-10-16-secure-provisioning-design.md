# NEXUS — Especificação: provisionamento inicial seguro

> **Nota de escopo:** especificação histórica. O Supabase DEV atualmente autorizado é `qwvbvqlzcyfkuszxrlgv`; referências ao destino antigo não são instruções de execução.

Data: 2026-10-16  
Destino confirmado: Supabase `qidstqsbxwkbkwowhpab`  
Estado: proposta aprovada para planejamento; nenhuma migration aplicada.

## Problema confirmado

O frontend chama `provision_new_user` para um usuário Auth sem perfil. No destino, a RPC não existe, não há Edge Functions, `profiles` tem somente policy de SELECT e as três tabelas públicas estão vazias. O primeiro cadastro não consegue concluir perfil e organização.

O frontend publicado também apresentou `AuthRetryableFetchError: Failed to fetch`. Essa falha de conectividade é separada: a URL/chave Vite efetivamente incorporadas no deployment ainda não foram verificadas contra o destino.

## Escopo

Implementar apenas a fundação de autenticação e provisionamento:

- Provisionar, de forma idempotente, uma organização e um perfil administrador inicial para uma identidade Auth elegível.
- Bloquear provisionamento para contas convidadas e impedir criação de tenant duplicado.
- Formalizar o fluxo de convite para inserir o perfil no tenant já existente sem depender de metadados editáveis como autorização.
- Testar isolamento entre duas organizações no backend.
- Validar o deployment Preview com par URL/chave pública do mesmo projeto.

Fora do escopo: migração de dados do banco histórico, troca de Production, novos módulos operacionais, cobrança e criação arbitrária de superadmin.

## Arquitetura proposta

A migration deve criar uma única RPC transacional de provisionamento, em schema não exposto quando possível. Ela deve:

1. Exigir `auth.uid()`; nunca receber `user_id`, `organization_id` ou papel do cliente.
2. Verificar se já existe `profiles.id = auth.uid()`; nesse caso retornar o perfil/tenant existente sem criar registros.
3. Identificar contas convidadas por um vínculo persistido e confiável no backend. Metadados de usuário servem apenas como dados de exibição, nunca como autorização.
4. Criar a organização e o primeiro perfil com papel `admin`, nunca `superadmin`.
5. Usar unicidade de slug e tratamento explícito de colisão/concorrência.
6. Usar `SET search_path = ''`, privilégios mínimos e `REVOKE EXECUTE FROM PUBLIC`; conceder execução somente a `authenticated`.
7. Registrar erro parcial de modo recuperável e não retornar sucesso até que organização e perfil existam.

O fluxo de convite deve usar servidor privilegiado somente após autenticar o solicitante e checar, no banco, papel administrativo e tenant de destino. A criação de Auth e perfil deve ter estratégia explícita de compensação/retry para falha parcial.

## RLS e invariantes

- Um usuário só lê o próprio perfil, salvo administrador do mesmo tenant.
- Nenhuma policy cliente pode inserir/alterar `role`, `organization_id` ou `is_blocked` fora do fluxo autorizado.
- `user_module_permissions` só pode ser lida pelo próprio usuário ou administrada por admin do mesmo tenant.
- A troca de organização não pode ser feita pelo update direto do próprio perfil; exige vínculo formal e operação de backend autorizada.
- Todas as tabelas futuras com dados de negócio devem exigir tenant no backend e políticas de SELECT/INSERT/UPDATE/DELETE coerentes.

## Plano de testes antes de corte

1. Teste de migração em Preview/controlado, com rollback conhecido.
2. Primeiro cadastro: identidade Auth -> organização -> perfil admin; repetir a operação sem duplicar.
3. Convite: admin do tenant A convida operador; perfil nasce no tenant A; convite a tenant B é recusado.
4. Isolamento: identidades de A e B tentam ler, inserir, alterar e excluir perfis/permissões cruzados; todas as tentativas indevidas devem falhar na API.
5. Browser: cadastro, login, logout, sessão, rota protegida e falha de perfil ausente.
6. Vercel Preview: confirmar host público compilado, URL e chave pública do mesmo projeto e logs sem erro Auth.
7. Só então avaliar Production; não trocar variáveis de Production neste ciclo.

## Critérios de aceite

- A RPC existe, está restrita e passa os testes de idempotência e concorrência.
- Não há elevação de papel nem troca de tenant pelo navegador.
- Convites e primeiro cadastro têm resultado verificável no banco.
- RLS bloqueia acesso cruzado por API.
- Preview autentica contra `qidstqsbxwkbkwowhpab`.
- SQL, resultado dos testes e rollback são revisados antes de aplicar no destino.

## Riscos e bloqueios

Aplicar essa mudança requer aprovação específica do SQL, como definido no protocolo do projeto. A Vercel permanece não verificada enquanto as variáveis Vite não forem comparadas de forma segura ao projeto confirmado. Production continua inalterada.
