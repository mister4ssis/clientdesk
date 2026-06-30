# Sincronização Offline-First

## Arquitetura

O SQLite local continua sendo a fonte primária do ClientDesk. O Supabase é usado em segundo plano para envio local e, quando `SYNC_PULL_ENABLED=true` com Auth/RLS seguro, para recebimento incremental remoto.

```text
Renderer -> preload -> IPC -> CustomerService -> SQLite -> sync_outbox -> BackgroundSyncService -> Supabase -> CustomerPullService -> SQLite
```

## Outbox

Toda alteração sincronizável de cliente marca `customers.sync_status = PENDING` e insere ou atualiza um item em `sync_outbox` na mesma transação SQLite. A fila mantém apenas um item por cliente (`UNIQUE(entity_type, entity_id)`), então várias edições antes da sincronização são consolidadas.

## Gatilhos

A sincronização pode ser solicitada:

- na inicialização do app;
- após cadastro, edição, ativação ou inativação;
- no intervalo configurado por `MAIN_VITE_SYNC_INTERVAL_MINUTES`;
- por evento Supabase Realtime Broadcast em canal privado do usuário;
- pelo botão "Sincronizar agora" na página de configurações.

Falhas remotas não impedem o sucesso local. A UI deve informar que a alteração está salva localmente e ficará pendente.

## Observabilidade

O ciclo de sincronização registra logs sanitizados com:

- `syncRunId`;
- fase (`START`, `PUSH`, `PULL`, `SKIPPED`, `COMPLETE`);
- contadores processados, pendentes e conflitos;
- duração;
- código de erro.

Os logs não incluem nome de cliente, CPF/CNPJ, e-mail, telefone, representante, snapshots, tokens ou chaves.

Além do log de console sanitizado, cada ciclo grava `sync_run_log` no SQLite com motivo (`STARTUP`, `PERIODIC`, `MANUAL`, `LOCAL_CHANGE`, `REALTIME_EVENT`, `RECONNECT`), status, contadores, duração e código de erro. Esse registro é observacional e não pode impedir push/pull.

A tela `/settings/diagnostics` exibe os últimos ciclos e permite exportar um JSON sanitizado. A retenção é controlada por `MAIN_VITE_SYNC_LOG_RETENTION_DAYS` e `MAIN_VITE_SYNC_LOG_MAX_ROWS`.

## Autenticação

O ciclo remoto só executa em `AUTHENTICATED`. Em `OFFLINE_AUTHENTICATED` ou `SESSION_EXPIRED`, o app mantém outbox/cursor/conflitos locais, mas não chama Supabase.

Antes de sincronizar, o serviço confirma que o usuário autenticado corresponde ao banco aberto.

## Pull Remoto

O ciclo executa push antes de pull. O recebimento usa cursor composto em `sync_cursors` (`last_remote_updated_at`, `last_remote_id`) e ordenação remota determinística por `updated_at ASC, id ASC`.

`SYNC_PULL_ENABLED=false` é o padrão porque o repositório ainda não possui fluxo de autenticação do usuário final. Habilite apenas quando a tabela remota estiver protegida por RLS por `user_id = auth.uid()`.

## Realtime

Supabase Realtime é usado apenas como gatilho para reduzir latência do pull incremental. O payload do evento não é aplicado diretamente no SQLite e não é registrado em logs.

O canal é privado por usuário no formato `user:<user-id>:customers`, criado apenas no processo main e removido em logout, troca de usuário, expiração de sessão ou encerramento. O polling periódico permanece ativo como fallback e mecanismo de recuperação.

Consulte `REALTIME_SYNC.md`.

## Retry e Backoff

Falhas incrementam `attempts`, mantêm o item na fila e definem `next_attempt_at` com atraso progressivo: 1, 2, 5, 15 e 30 minutos, com pequeno jitter.

## Estados

- `PENDING`: alteração local ainda não confirmada no Supabase.
- `SYNCED`: versão local enviada com sucesso.
- `ERROR`: falha remota registrada com código sanitizado.
- `CONFLICT`: alteração local e remota concorrentes exigem resolução manual.

## Conflitos

Conflitos são registrados em `sync_conflicts` quando há alteração local pendente e versão remota mais nova. A interface em `/settings/sync/conflicts` permite manter a versão local ou usar a versão do servidor. Não há merge campo a campo nesta etapa.

## Limitações

Não há merge automático campo a campo, Supabase Presence, Postgres Changes no cliente ou sincronização de exclusão física. O Realtime não substitui o polling periódico.

## Validação Multi-Instância

Os testes padrão em `tests/integration/sync` simulam duas instalações com bancos SQLite separados e Supabase mockado. Eles validam convergência, conflitos, cursor, offline/reinício e isolamento de usuários sem exigir internet.

Consulte `MULTI_INSTANCE_TESTING.md` e `SYNC_VALIDATION_REPORT.md`.
