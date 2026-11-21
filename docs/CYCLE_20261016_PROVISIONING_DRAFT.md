# Ciclo — proposta de provisionamento

Estado: EM DESENVOLVIMENTO / SQL AGUARDANDO APROVACAO.

- Commit publicado: 1da10f10f14d00ab8f04fb985b0077756ef81062.
- CI #66, run 38938172558: success.
- Preview dpl_AgRdG6qbMdZWxueKKfH68Y4imCzg: READY.
- Isso comprova compilacao/CI, nao login ou isolamento real.
- Proposta SQL: docs/sql/provision_new_user.proposed.sql. Nenhum SQL aplicado.
- Identidade vem de auth.uid(); email e invited_at vem de auth.users, sem autorizar por user_metadata.
- Linha Auth bloqueada para serializar repeticoes; organizacao/perfil criados atomicamente; papel fixo admin.
- Revisao pendente: contrato de confirmacao de email, privilegios do proprietario, auditoria de provisionamento e testes reais de concorrencia, convite e dois tenants.
- CLI Supabase, psql e Docker nao foram encontrados; teste SQL local BLOQUEADO. Arquivo fica como proposta fora de migrations ate validacao.
- Proxima acao: revisar proposta com schema Auth e grants reais, preparar testes SQL e apresentar script final para aprovacao especifica.

Revisao adicional: auth.users possui id, email, invited_at e email_confirmed_at com tipos compativeis com a proposta. Consulta somente leitura confirmou grants administrativos de authenticated em organizations/profiles, incluindo TRUNCATE, que nao e protegido por RLS. Preparado docs/sql/restrict_table_privileges.proposed.sql; nenhum privilegio alterado, nenhum TRUNCATE executado. Exposicao por API nao demonstrada.
