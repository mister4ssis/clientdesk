# Supabase Realtime como Gatilho de Sincronização

## Arquitetura

O Realtime não é uma segunda implementação de sincronização. Ele apenas reduz a latência para iniciar o pull incremental já existente.

```text
public.customers
  -> trigger public.broadcast_customer_changes()
  -> realtime.broadcast_changes
  -> canal privado user:<user-id>:customers
  -> RealtimeSyncTriggerService
  -> BackgroundSyncService.requestSync({ reason: 'REALTIME_EVENT' })
  -> CustomerPullService
  -> SQLite
```

O payload recebido pelo evento nunca é aplicado diretamente no SQLite. O SQLite só muda depois que o pull incremental consulta o Supabase, valida os dados, detecta conflitos e aplica a alteração transacionalmente.

## Broadcast

A migration `202606260002_customer_realtime_broadcast.sql` cria `public.broadcast_customer_changes()` e o trigger `trg_customers_realtime_broadcast` em `public.customers`.

O tópico é derivado do proprietário real da linha:

```text
user:<user-id>:customers
```

Em `INSERT` e `UPDATE`, o `user_id` vem de `NEW`. Em `DELETE`, usado apenas por compatibilidade técnica, vem de `OLD`. O aplicativo continua usando exclusão lógica por `deleted_at`.

## Canal Privado

O canal é criado somente no processo main quando há usuário autenticado, sessão válida e sincronização habilitada. O renderer não recebe tópico, token, payload, socket ou cliente Supabase.

Ao trocar usuário, expirar sessão, fazer logout ou encerrar o aplicativo, o canal atual é removido. O canal do usuário anterior nunca é mantido depois de uma troca de conta.

## Autorização

A policy em `realtime.messages` permite `SELECT` apenas para `authenticated` quando:

```sql
realtime.topic() = 'user:' || auth.uid()::text || ':customers'
```

Não há acesso para `anon`, tópico global de clientes ou policy irrestrita.

## Debounce

`MAIN_VITE_REALTIME_PULL_DEBOUNCE_MS` controla a consolidação de eventos. O padrão é `500`, com limite entre `100` e `5000`.

Eventos recebidos durante a janela de debounce viram uma única solicitação de sincronização. Se outro ciclo já estiver em andamento, o serviço agenda mais um ciclo depois do atual.

## Reconexão

Falhas `CHANNEL_ERROR`, `TIMED_OUT` e `CLOSED` usam backoff progressivo com jitter, limitado por `MAIN_VITE_REALTIME_RECONNECT_MAX_SECONDS`:

- 1 segundo
- 2 segundos
- 5 segundos
- 15 segundos
- 30 segundos
- máximo configurado

O backoff é resetado após `SUBSCRIBED`. Não há reconexão durante logout ou encerramento.

## Polling como Fallback

O polling por `MAIN_VITE_SYNC_INTERVAL_MINUTES` continua ativo mesmo com Realtime conectado. O objetivo do polling é recuperar eventos perdidos, quedas do canal e janelas offline.

## Proteção Contra Eco

Uma alteração enviada pela própria instalação pode gerar evento Realtime para ela mesma. Isso é esperado. A proteção contra loop vem de:

- pull incremental com cursor;
- `remote_version`;
- controle otimista remoto;
- `applyRemoteCustomer`, que não cria outbox.

## Status Público

`sync:get-status` retorna status sanitizado:

- `realtimeStatus`
- `lastRealtimeEventAt`
- `lastRealtimeConnectedAt`

Não retorna tópico, userId, payload ou token.

Eventos que disparam sincronização por Realtime são registrados em `sync_run_log` com motivo `REALTIME_EVENT`. O payload recebido não é persistido nem exportado.

## Testes

Os testes padrão usam mocks e não exigem internet:

- `tests/main/sync/realtime`
- `tests/integration/realtime`

Testes reais devem ser opcionais, em projeto Supabase de teste, protegidos por `RUN_SUPABASE_REALTIME_TESTS=true`.

## Limitações

Esta etapa não implementa Presence, Postgres Changes no cliente, Realtime como fonte de dados, organizações ou compartilhamento entre usuários.
