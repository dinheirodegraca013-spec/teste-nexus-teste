-- PROPOSTA NAO APLICADA. Destino: qidstqsbxwkbkwowhpab.
-- TRUNCATE nao e protegido por RLS. Nao executar TRUNCATE como teste.
-- Remove privilegios administrativos desnecessarios dos papeis da API.
-- Preserva SELECT/INSERT/UPDATE/DELETE e todas as policies existentes.
BEGIN;
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.organizations, public.profiles, public.user_module_permissions
  FROM authenticated, anon;
COMMIT;

-- Verificacao somente leitura apos aprovacao e aplicacao:
SELECT c.relname,
       has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS authenticated_truncate,
       has_table_privilege('anon', c.oid, 'TRUNCATE') AS anon_truncate
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';
-- Esperado: false em ambas as colunas para as tres tabelas.
