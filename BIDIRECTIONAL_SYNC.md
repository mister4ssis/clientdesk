# Sincronização Bidirecional

## Modelo

O SQLite local continua sendo a fonte primária para uso offline. O ciclo de sincronização agora é:

```text
verificar configuração -> verificar Auth/RLS -> push local -> pull remoto -> aplicar ou registrar conflitos
```

O envio local sempre ocorre antes do recebimento remoto. Uma falha no pull não desfaz uploads concluídos.

## Habilitação

`SYNC_PULL_ENABLED=false` é o padrão. O pull só deve ser habilitado quando houver sessão Supabase autenticada e policies RLS restringindo `customers.user_id = auth.uid()`.

Mesmo com `SYNC_PULL_ENABLED=true`, o ciclo remoto só executa quando `AuthState.status = AUTHENTICATED` e o banco SQLite aberto pertence ao mesmo `user.id`.

Variáveis:

```text
SYNC_PULL_ENABLED=false
SYNC_PULL_BATCH_SIZE=100
```

## Cursor Incremental

O cursor fica em `sync_cursors` com escopo `CUSTOMERS`. Ele guarda:

- `last_remote_updated_at`
- `last_remote_id`

A consulta remota ordena por `updated_at ASC, id ASC` e busca apenas registros posteriores ao cursor composto. O cursor só avança depois que o lote é processado localmente.

## Versionamento Remoto

A tabela remota usa:

- `user_id` para propriedade do registro;
- `version` para controle otimista;
- `updated_at` controlado por trigger no Postgres;
- `deleted_at` para exclusão lógica remota.

O app usa a RPC `sync_upsert_customer(customer_data, expected_version)` em vez de upsert cego.

## Aplicação Remota

Registros remotos sem alteração local pendente são aplicados no SQLite por `applyRemoteCustomer()`. Esse caminho não cria item na `sync_outbox`.

Se houver alteração local pendente e `remote.version > customers.remote_version`, o cliente não é sobrescrito: um conflito é registrado em `sync_conflicts`.

## Exclusão Lógica

`deleted_at` remoto não executa DELETE físico. Clientes excluídos remotamente ficam fora da listagem normal por filtro `deleted_at IS NULL`. Se houver alteração local pendente, a exclusão remota vira conflito.

## Limitações

- Sem Supabase Realtime, Broadcast ou Postgres Changes.
- Sem merge campo a campo.
- Sem múltiplas organizações.
- Pull remoto fica bloqueado por padrão até Auth/RLS seguro estar configurado.
