# Sincronização Offline-First

## Arquitetura

O SQLite local continua sendo a fonte primária do ClientDesk. O Supabase é um destino de sincronização em segundo plano, somente no sentido local -> remoto.

```text
Renderer -> preload -> IPC -> CustomerService -> SQLite -> sync_outbox -> BackgroundSyncService -> Supabase
```

## Outbox

Toda alteração sincronizável de cliente marca `customers.sync_status = PENDING` e insere ou atualiza um item em `sync_outbox` na mesma transação SQLite. A fila mantém apenas um item por cliente (`UNIQUE(entity_type, entity_id)`), então várias edições antes da sincronização são consolidadas.

## Gatilhos

A sincronização pode ser solicitada:

- na inicialização do app;
- após cadastro, edição, ativação ou inativação;
- no intervalo configurado por `SYNC_INTERVAL_MINUTES`;
- pelo botão "Sincronizar agora" na página de configurações.

Falhas remotas não impedem o sucesso local. A UI deve informar que a alteração está salva localmente e ficará pendente.

## Retry e Backoff

Falhas incrementam `attempts`, mantêm o item na fila e definem `next_attempt_at` com atraso progressivo: 1, 2, 5, 15 e 30 minutos, com pequeno jitter.

## Estados

- `PENDING`: alteração local ainda não confirmada no Supabase.
- `SYNCED`: versão local enviada com sucesso.
- `ERROR`: falha remota registrada com código sanitizado.

## Limitações

Não há sincronização Supabase -> SQLite nesta etapa. Alterações feitas diretamente no Supabase podem ser sobrescritas por uma sincronização local futura.
