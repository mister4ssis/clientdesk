# Resolução de Conflitos

## Quando Ocorre

Um conflito de cliente ocorre quando:

- existe item pendente na `sync_outbox`; e
- a versão remota (`version`) é maior que `customers.remote_version`.

O app não usa apenas `updated_at` local para detectar concorrência.

## Registro Local

Conflitos são salvos em `sync_conflicts` com:

- `local_data`: snapshot local em JSON;
- `remote_data`: snapshot remoto em JSON;
- `remote_version`;
- datas de atualização local e remota;
- status `PENDING`, `RESOLVED_LOCAL` ou `RESOLVED_REMOTE`.

O cliente também recebe `sync_status = CONFLICT` e `sync_conflict = 1`.

## Opções

### Manter Dados Deste Computador

O app tenta enviar a versão local por RPC usando a versão remota esperada. Se o servidor mudou novamente, o conflito permanece pendente.

Em sucesso, o app atualiza `remote_version`, `remote_updated_at`, limpa `sync_conflict`, remove a outbox e marca o conflito como `RESOLVED_LOCAL`.

### Utilizar Dados Do Servidor

O snapshot remoto é aplicado no SQLite em transação, a outbox do cliente é removida, `sync_conflict` é limpo e o conflito vira `RESOLVED_REMOTE`.

## Interface

A página `/settings/sync/conflicts` lista conflitos pendentes, compara os principais campos e exige confirmação antes de resolver. Ela não exibe JSON cru, chaves, SQL, stack trace ou dados técnicos de RLS.

## Segurança

Snapshots de conflito podem conter dados pessoais. Eles não devem ser enviados a telemetria nem registrados em logs.
