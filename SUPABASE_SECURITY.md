# Segurança Supabase

## Chaves

O aplicativo desktop pode usar somente `MAIN_VITE_SUPABASE_URL` e `MAIN_VITE_SUPABASE_PUBLISHABLE_KEY`, carregadas no processo main.

Nunca use ou distribua:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- certificados, tokens administrativos ou credenciais privadas.

Chaves secretas não devem ser lidas nem distribuídas pelo aplicativo.

## RLS e Auth

A migration remota habilita RLS, mas não cria policy pública permissiva. Não desabilite RLS e não crie policy `USING (true)` para resolver sincronização.

`MAIN_VITE_SYNC_ENABLED=false` e `MAIN_VITE_SYNC_PULL_ENABLED=false` permanecem como padrão. A infraestrutura local, migrations remotas, RLS por `user_id = auth.uid()` e RPC versionada estão prontas, mas a sincronização remota não deve ser tratada como pronta para produção até existir sessão autenticada segura.

O pull remoto é bloqueado por segurança quando não há sessão. Não contorne isso criando policy pública, desabilitando RLS ou usando `service_role`.

## Propriedade dos Registros

A estratégia adotada para o remoto é `customers.user_id UUID NOT NULL REFERENCES auth.users(id)`. O valor é derivado de `auth.uid()` na RPC/policies e não deve ser aceito livremente do renderer ou de payloads locais.

`tax_id` é único por usuário via índice parcial `UNIQUE (user_id, tax_id) WHERE tax_id IS NOT NULL`. O mesmo CPF/CNPJ pode existir para usuários diferentes.

## Policies

Somente a role `authenticated` recebe acesso:

- SELECT: `(select auth.uid()) = user_id`
- INSERT: `WITH CHECK ((select auth.uid()) = user_id)`
- UPDATE: `USING` e `WITH CHECK` com o mesmo usuário

Não há policy de DELETE. O sistema usa exclusão lógica.

## RPC

`sync_upsert_customer` é `SECURITY INVOKER`, usa `auth.uid()` para definir e filtrar `user_id`, revoga execução de `PUBLIC` e `anon`, e concede execução somente para `authenticated`.

## Realtime

Realtime usa Broadcast privado por tópico `user:<user-id>:customers`. O tópico é gerado no banco a partir de `customers.user_id` pela função `public.broadcast_customer_changes()`.

A função de trigger usa `SECURITY DEFINER` com `search_path` fixo somente para chamar `realtime.broadcast_changes` a partir do trigger. Ela não recebe tópico do cliente e não aceita `user_id` arbitrário do renderer.

A policy em `realtime.messages` concede `SELECT` apenas para `authenticated` no próprio tópico do usuário via `realtime.topic() = 'user:' || auth.uid()::text || ':customers'`. Não há policy para `anon` nem tópico global.

## Renderer

O renderer não recebe URL, chaves, cliente Supabase, `fetch` genérico ou canais arbitrários. Toda sincronização passa por IPC específico e serviços no processo main.

## Logs

Logs de sincronização não devem conter CPF/CNPJ, e-mail, telefone, observações, chaves, URL com credenciais ou mensagens completas do banco remoto.

Diagnósticos exportados são sanitizados e não incluem Supabase URL completa, publishable key, tokens, sessão, payloads Realtime, snapshots de conflito, clientes ou dados pessoais.
