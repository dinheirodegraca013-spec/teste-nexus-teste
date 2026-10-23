# Sincronização OBRAMAXAUTO — 2026-10-16

Origem: https://github.com/dinheirodegraca013-spec/OBRAMAXAUTO
Revisão de origem: `0a6d1ef38048b517ff6179c5e61497091f591cbd`
Destino: NEXUS, branch `fix/persist-rbac-permissions`
Conteúdo: 27 arquivos `.agents/skills/*/SKILL.md`, regras `OBRAMAXAUTO.md` e marcador não destrutivo no `AGENTS.md` já existente.

**Limites:** foram importadas somente instruções das skills, sem executar código externo e sem instalar o runner Python no GitHub Actions. O agente do NEXUS deve usar as skills aplicáveis por tarefa; o executor horário já existente mantém as restrições do workflow. Nenhum banco de dados, segredo, deployment ou repositório não autorizado é alterado por esta sincronização.

**Validação:** os 27 arquivos foram inspecionados para front matter e procedimento operacional antes da importação. Para validar a integração, conferir presença dos arquivos, commits e execução de GitHub Actions; testes unitários do runner Python OBRAMAXAUTO não foram executados aqui.
