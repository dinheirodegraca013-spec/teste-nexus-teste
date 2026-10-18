# Instruções de operação OBRAMAXAUTO para ESTE projeto

## Autoridade
ESCOPO.md define o produto; AGENTS.md local complementa; políticas superiores do ambiente prevalecem. Não inventar requisitos nem expandir finalidades de dados pessoais.

## Protocolo de execução
1. Ler ESCOPO.md, BACKLOG.md, ESTADO.md, TESTES.md e AUDITORIA.md; inspecionar código e testes existentes.
2. Selecionar a próxima tarefa autorizada, de maior impacto e sem dependência bloqueada.
3. Invocar as skills pertinentes de `.agents/skills/`; ler somente os SKILL.md necessários.
4. Implementar a menor mudança útil, com teste e evidência.
5. Registrar arquivos afetados, testes executados e próximos passos, mantendo rastreabilidade.
6. Continuar outras tarefas autorizadas na mesma sessão, sem solicitar 'continue', enquanto houver tempo e recursos.
7. Finalizar resposta com UMA linha exata: `STATUS: CONTINUE`, `STATUS: READY` ou `STATUS: BLOCKED`.

## Critérios para STATUS
- CONTINUE: há trabalho autorizado verificável a realizar; não encerrar só porque um subpasso acabou.
- READY: backlog aprovado esgotado, critérios de aceite comprovados e auditoria final passou. Pode continuar existindo risco residual documentado.
- BLOCKED: falta credencial, ferramenta, autorização, decisão ou existe risco sem tratamento; indicar ação humana em ESTADO.md.

## Autorizações e limites
- Pode editar código, testes e migrações de desenvolvimento, sempre na branch do agente.
- Pode investigar logs em ambientes de desenvolvimento autorizados e remover falhas comprovadas.
- NÃO pode fazer deploy de produção, alterar main, forçar push, excluir dados, alterar faturamento, revelar segredos ou ampliar acesso sem aprovação explícita.
- NÃO deve tentar contornar sandbox, aprovação ou autenticação. Em modo sem perguntas, registrar bloqueio e prosseguir apenas com tarefas independentes.
- Para software eleitoral/geolocalização, aplicar privacidade por padrão, minimização de dados, RLS rigoroso e revisão legal para dados sensíveis.

## Qualidade
Fazer verificações reais de build, lint, tipos, testes unitários, integração, browser e autorização conforme stack. Não falsificar saída de testes. Distinguir 'não executado' de 'aprovado'.


## Regras específicas do NEXUS
- Projeto Supabase de desenvolvimento autorizado: `qidstqsbxwkbkwowhpab`. Não tocar em nenhum projeto antigo, Gestio ou produção.
- Branch de implementação: `fix/persist-rbac-permissions`; PR #1 precisa permanecer sem merge até homologação.
- Antes de agir, consultar `docs/AUTONOMIA_NEXUS.md` e `docs/NEXUS_FULL_AUDIT_20261016.md`.
- Conforme `AGENTS.md` do NEXUS, SQL estrutural, RLS e funções privilegiadas exigem apresentação do script e aprovação específica.
- As skills não substituem credenciais, não contornam limites da API e não implantam um serviço 24/7.
