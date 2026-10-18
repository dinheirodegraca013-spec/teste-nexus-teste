# Configuração Vercel Production — NEXUS

O build é Vite e lê somente estas variáveis:

- `VITE_SUPABASE_URL` = URL do projeto Supabase que deve atender Production.
- `VITE_SUPABASE_ANON_KEY` = chave pública/anon correspondente ao mesmo projeto.

Após configurar as duas variáveis no alvo **Production**, faça um novo deployment sem cache e valide o cadastro/login. Não use `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` como substitutos: esses nomes não são lidos pelo frontend Vite atual.

Não registrar chaves neste arquivo ou no Git.
