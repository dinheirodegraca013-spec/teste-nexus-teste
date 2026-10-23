# Plano de reconciliação de migrations — NEXUS DEV

> **Nota de escopo:** inventário histórico. O Supabase DEV atualmente autorizado é `qwvbvqlzcyfkuszxrlgv`; os números do destino antigo não representam o estado atual.

Estado verificado em 2026-10-18:

- Supabase DEV `qidstqsbxwkbkwowhpab`: 14 migrations registradas.
- Checkout local: 10 arquivos em `supabase/migrations`.
- Ausentes no checkout:
  - `20261016152053_restrict_rls_event_trigger_execution`
  - `20261016153154_nexus_core_organizations_profiles_permissions`
  - `20261016175917_provision_new_user`
  - `20261016182406_nexus_operational_modules_tenant_scoped`
  - `20261016182434_index_nexus_operational_foreign_keys`
  - `20261017002453_nexus_module_read_rls`
  - `20261018012432_nexus_private_storage_reviewed`

## Procedimento proposto

1. Recuperar as instruções exatas de cada migration do histórico DEV.
2. Comparar cada instrução com o schema e os arquivos já versionados.
3. Adicionar os arquivos ausentes ao repositório, preservando versão, nome e ordem, sem reaplicar no DEV.
4. Validar `supabase db diff`/equivalente em ambiente não produtivo e revisar DDL, RLS e funções privilegiadas.
5. Só aplicar qualquer SQL novo após aprovação específica do script correspondente.

## Risco e limite

Os itens 2, 3, 4 e 6 contêm DDL, RLS ou funções privilegiadas. Este documento não executa SQL nem autoriza alterações no banco; serve apenas para revisão humana e rastreabilidade.
