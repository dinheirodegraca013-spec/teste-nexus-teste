# Ciclo: bloqueio de perfil

Estado: EM DESENVOLVIMENTO.
Destino confirmado: qidstqsbxwkbkwowhpab.

Falha reproduzida: checkUserPermission autorizava administrador com is_blocked=true.
Correção: negar acesso a perfil bloqueado antes das regras por papel; declarar campo real em Profile.
Teste: regressão falhou antes da correção (true !== false), depois 3/3 passaram.
TypeScript e build aprovados após alinhamento do tipo. Vite concluiu em 8,88 s.
CI agora executa npm test; testes usam Node e esbuild existentes, sem novo framework.
Limite: validação cobre autorização de interface; RLS e sessões bloqueadas ainda requerem testes reais.
Próxima tarefa: revisar normalização de perfil, que atualmente força status ativo, e preparar SQL de provisionamento para aprovação.

Continuação: teste adicional reproduziu redirecionamento indevido do administrador bloqueado para dashboard. Corrigido para /403 antes da regra administrativa. Validação posterior registrada no relatório do ciclo.

Novo ciclo: normalização e listagem da equipe agora derivam status/is_active do campo is_blocked real. Teste reproduziu active=true indevido e passou após correção. Cinco testes, TypeScript e build aprovados (7,75 s). Push por Git local retornou 403 para Cabanas01; tentativa de publicação via conector autorizado em andamento.
