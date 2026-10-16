# Executor recorrente do NEXUS

## Como funciona

- Workflow: `.github/workflows/autonomous-nexus.yml`.
- Frequência: uma execução agendada por hora, além de execução manual.
- O executor usa a GitHub Action oficial `openai/codex-action@v1`.
- O Codex trabalha apenas no workspace da branch `fix/persist-rbac-permissions`.
- Cada ciclo escolhe uma tarefa delimitada, atualiza o estado persistente e executa TypeScript, build e validação Deno.
- Só persiste mudanças se os testes passarem; os commits são enviados à branch de trabalho, nunca diretamente à `main`.
- Não há merge automático, deploy de produção, acesso ao Supabase de produção ou aplicação automática de migrações.
- A execução tem timeout de 30 minutos e usa o perfil de permissões `:workspace`.

## Ativação necessária

A automação fica desabilitada até que a variável de repositório `NEXUS_AUTONOMY_ENABLED` esteja definida como `true`.

Também é necessário criar o segredo de Actions `OPENAI_API_KEY`. Não coloque a chave no repositório, em arquivos, logs ou nesta conversa.

No GitHub:
1. Abra **Settings → Secrets and variables → Actions**.
2. Em **Variables**, crie `NEXUS_AUTONOMY_ENABLED` com valor `true`.
3. Em **Secrets**, crie `OPENAI_API_KEY` com uma chave de API válida.
4. Antes de habilitar, configure um limite de gastos no projeto de API da OpenAI. O timeout limita a duração, não substitui um orçamento de API.

## Limites e riscos conhecidos

- A agenda horária é recorrente, não execução ininterrupta: o GitHub pode atrasar ou suspender execuções.
- O runner só tem acesso ao repositório e aos serviços que forem explicitamente adicionados ao workflow.
- A função não recebe credenciais de Supabase nem Vercel; mudanças de banco são preparadas e revisadas, mas não aplicadas pelo runner.
- Se validação falhar, o workflow não faz push e preserva um diff de diagnóstico como artefato.
- O executor não pode modificar workflows, arquivos de ambiente, fazer merge ou publicar em produção.
- A branch de trabalho e o PR #1 continuam sujeitos a revisão e validação antes de merge.

## Estado

O workflow foi preparado em branch de infraestrutura. Ele só começará a executar ciclos após ser incorporado à branch padrão e depois que a variável e o segredo forem configurados.
