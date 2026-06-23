# Supabase

## Variáveis

Configure apenas no processo main:

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SYNC_ENABLED=false
SYNC_INTERVAL_MINUTES=5
SYNC_BATCH_SIZE=50
SYNC_REQUEST_TIMEOUT_MS=10000
```

`SUPABASE_ANON_KEY` é aceito como compatibilidade quando `SUPABASE_PUBLISHABLE_KEY` não existir. Não use `service_role` em aplicativo desktop.

## Tabela Remota

A migration remota está em `supabase/migrations/202606220001_create_customers_for_sync.sql`. Ela cria/ajusta `public.customers`, adiciona `representative`, cria índice para `tax_id` não nulo e habilita RLS.

Aplicação manual:

```bash
supabase db push
```

ou aplique o SQL pelo painel do Supabase em um ambiente controlado.

## Tipos

`src/main/integrations/supabase/database.types.ts` contém tipos mínimos explícitos. Quando o projeto Supabase estiver definido, regenere tipos oficiais com Supabase CLI e revise o diff.

## Execução

Com `SYNC_ENABLED=false`, o app funciona normalmente offline. Com `SYNC_ENABLED=true`, o processo main cria um cliente Supabase sem persistir sessão em APIs do navegador e executa upsert em `customers` por `id`.

Testes padrão usam mocks e não acessam Supabase real. Testes reais futuros devem ficar atrás de `RUN_SUPABASE_INTEGRATION_TESTS=true`.
