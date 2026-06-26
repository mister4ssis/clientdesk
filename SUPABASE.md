# Supabase

## Variáveis

Configure apenas no processo main:

```text
MAIN_VITE_SUPABASE_URL=
MAIN_VITE_SUPABASE_PUBLISHABLE_KEY=
MAIN_VITE_SYNC_ENABLED=false
MAIN_VITE_SYNC_INTERVAL_MINUTES=5
MAIN_VITE_SYNC_BATCH_SIZE=50
MAIN_VITE_SYNC_REQUEST_TIMEOUT_MS=10000
MAIN_VITE_SYNC_PULL_ENABLED=false
MAIN_VITE_SYNC_PULL_BATCH_SIZE=100
MAIN_VITE_REALTIME_ENABLED=true
MAIN_VITE_REALTIME_PULL_DEBOUNCE_MS=500
MAIN_VITE_REALTIME_RECONNECT_MAX_SECONDS=60
```

Essas variáveis são carregadas apenas no processo main pelo electron-vite. Não use variáveis `RENDERER_VITE_*` para Supabase e não use `service_role` em aplicativo desktop.

## Tabela Remota

As migrations remotas ficam em `supabase/migrations/`:

- `202606220001_create_customers_for_sync.sql`: cria/ajusta `public.customers`, adiciona `representative`, cria índice para `tax_id` não nulo e habilita RLS.
- `202606230001_bidirectional_customer_sync.sql`: adiciona `user_id`, `version`, `deleted_at`, trigger de versionamento, policies RLS por usuário autenticado e RPC `sync_upsert_customer`.
- `202606230002_auth_rls_customer_owner.sql`: reforça RLS por usuário, ajusta unicidade de `tax_id` para `(user_id, tax_id)` e recria a RPC como `SECURITY INVOKER`.
- `202606260001_finalize_customer_owner_constraints.sql`: valida `user_id`, aplica `NOT NULL` quando seguro e reforça índices, policies e permissões da RPC.
- `202606260002_customer_realtime_broadcast.sql`: cria Broadcast Realtime privado por usuário para mudanças em `public.customers` e policy em `realtime.messages`.

## Aplicação

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Não salve `<PROJECT_REF>`, senha do banco, access token ou chaves no repositório.

Os scripts equivalentes são:

```bash
npm run supabase:link
npm run supabase:status
npm run supabase:push:dry
npm run supabase:push
```

Não execute `db reset --linked`.

## Validação

Após aplicar, valide o schema remoto:

```bash
npx supabase db query --linked --file supabase/validation/validate-clientdesk-remote-schema.sql
npx supabase db query --linked --file supabase/validation/validate-clientdesk-realtime.sql
```

Todos os registros retornados devem possuir `passed = true`.

## Tipos

`src/main/integrations/supabase/database.types.ts` contém tipos mínimos explícitos. Quando o projeto Supabase estiver definido, regenere tipos oficiais com Supabase CLI e revise o diff.

## Execução

Com `MAIN_VITE_SYNC_ENABLED=false`, o app funciona normalmente offline. A autenticação ainda pode usar Supabase se `MAIN_VITE_SUPABASE_URL` e `MAIN_VITE_SUPABASE_PUBLISHABLE_KEY` estiverem configuradas. Com `MAIN_VITE_SYNC_ENABLED=true`, o processo main usa o mesmo cliente Supabase para sincronização, sem persistir sessão em APIs do navegador.

O push usa a RPC `sync_upsert_customer` com controle otimista por `version`. O pull incremental só deve ser habilitado com `MAIN_VITE_SYNC_PULL_ENABLED=true` quando existir sessão autenticada e RLS validado.

Realtime pode ser habilitado com `MAIN_VITE_REALTIME_ENABLED=true`. Ele não substitui o polling e não aplica payload diretamente; apenas solicita o ciclo incremental existente.

## Controle de Acesso

A estratégia documentada usa `user_id UUID NOT NULL REFERENCES auth.users(id)`. O `user_id` é derivado de `auth.uid()` no banco remoto; o renderer nunca informa esse campo.

Não aplique policies públicas globais. Teste as policies em ambiente seguro antes de habilitar pull remoto.

Para dados remotos existentes sem proprietário, use o roteiro manual em `supabase/manual/assign-existing-customers-owner.sql` e valide:

```sql
select count(*)
from public.customers
where user_id is null;
```

Testes padrão usam mocks e não acessam Supabase real. Testes reais futuros devem ficar atrás de `RUN_SUPABASE_INTEGRATION_TESTS=true`.
