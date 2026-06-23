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
SYNC_PULL_ENABLED=false
SYNC_PULL_BATCH_SIZE=100
```

`SUPABASE_ANON_KEY` é aceito como compatibilidade quando `SUPABASE_PUBLISHABLE_KEY` não existir. Não use `service_role` em aplicativo desktop.

## Tabela Remota

As migrations remotas ficam em `supabase/migrations/`:

- `202606220001_create_customers_for_sync.sql`: cria/ajusta `public.customers`, adiciona `representative`, cria índice para `tax_id` não nulo e habilita RLS.
- `202606230001_bidirectional_customer_sync.sql`: adiciona `user_id`, `version`, `deleted_at`, trigger de versionamento, policies RLS por usuário autenticado e RPC `sync_upsert_customer`.

Aplicação manual:

```bash
supabase db push
```

ou aplique o SQL pelo painel do Supabase em um ambiente controlado.

## Tipos

`src/main/integrations/supabase/database.types.ts` contém tipos mínimos explícitos. Quando o projeto Supabase estiver definido, regenere tipos oficiais com Supabase CLI e revise o diff.

## Execução

Com `SYNC_ENABLED=false`, o app funciona normalmente offline. Com `SYNC_ENABLED=true`, o processo main cria um cliente Supabase sem persistir sessão em APIs do navegador.

O push usa a RPC `sync_upsert_customer` com controle otimista por `version`. O pull incremental só deve ser habilitado com `SYNC_PULL_ENABLED=true` quando existir sessão autenticada e RLS validado.

## Controle de Acesso

A estratégia documentada usa `user_id UUID NOT NULL REFERENCES auth.users(id)`. O `user_id` é derivado de `auth.uid()` no banco remoto; o renderer nunca informa esse campo.

Não aplique policies públicas globais. Teste as policies em ambiente seguro antes de habilitar pull remoto.

Testes padrão usam mocks e não acessam Supabase real. Testes reais futuros devem ficar atrás de `RUN_SUPABASE_INTEGRATION_TESTS=true`.
