# IPC Contracts - ClientDesk

## Fluxo

```text
renderer -> window.clientDesk.customers -> preload -> ipcRenderer.invoke -> ipcMain.handle -> CustomerService -> CustomerRepository -> SQLite
```

O renderer nunca acessa `ipcRenderer`, Electron, `fs`, `path`, `better-sqlite3`, SQL ou o arquivo do banco.

## Resultado Padrão

Sucesso:

```ts
{ success: true, data: T }
```

Erro:

```ts
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

Não retornar `Error`, stack trace, SQL bruto, caminhos locais ou dados pessoais completos.

## Canais

| Canal | Entrada | Saída |
| --- | --- | --- |
| `app:get-version` | `void` | `IpcResult<string>` |
| `auth:get-state` | `void` | `IpcResult<AuthState>` |
| `auth:sign-in` | `{ email: string; password: string }` | `IpcResult<AuthState>` |
| `auth:sign-out` | `void` | `IpcResult<{ success: true }>` |
| `auth:refresh-session` | `void` | `IpcResult<AuthState>` |
| `customers:create` | `CreateCustomerInput` | `IpcResult<Customer>` |
| `customers:list` | `CustomerSearchFilters` | `IpcResult<CustomerListResult>` |
| `customers:get-by-id` | `{ id: string }` | `IpcResult<Customer>` |
| `customers:update` | `{ id: string; data: UpdateCustomerInput }` | `IpcResult<Customer>` |
| `customers:set-active` | `{ id: string; active: boolean }` | `IpcResult<Customer>` |
| `backup:create` | `void` | `IpcResult<BackupResult>` |
| `backup:restore` | `void` | `IpcResult<RestoreResult>` |
| `backup:validate` | `void` | `IpcResult<BackupValidationResult>` |
| `sync:get-status` | `void` | `IpcResult<SyncStatus>` |
| `sync:run-now` | `void` | `IpcResult<SyncRunResult>` |
| `sync:list-conflicts` | `void` | `IpcResult<SyncConflictSummary[]>` |
| `sync:get-conflict` | `{ id: string }` | `IpcResult<SyncConflictDetails>` |
| `sync:resolve-keep-local` | `{ id: string }` | `IpcResult<SyncConflictDetails>` |
| `sync:resolve-use-remote` | `{ id: string }` | `IpcResult<SyncConflictDetails>` |
| `audit:list-customer-history` | `{ customerId: string; filters?: CustomerAuditFilters }` | `IpcResult<CustomerAuditListResult>` |
| `diagnostics:get-summary` | `void` | `IpcResult<DiagnosticsSummary>` |
| `diagnostics:list-sync-runs` | `SyncRunLogFilters` | `IpcResult<SyncRunLog[]>` |
| `diagnostics:export` | `void` | `IpcResult<DiagnosticsExportResult>` |
| `update:get-state` | `void` | `IpcResult<UpdateState>` |
| `update:check` | `void` | `IpcResult<UpdateOperationResult>` |
| `update:download` | `void` | `IpcResult<UpdateOperationResult>` |
| `update:install` | `void` | `IpcResult<UpdateOperationResult>` |

Todos os nomes ficam centralizados em `src/shared/ipc/ipc-channels.ts`.

## Códigos de Erro

- `VALIDATION_ERROR`: dados inválidos.
- `CUSTOMER_NOT_FOUND`: cliente inexistente.
- `CUSTOMER_TAX_ID_ALREADY_EXISTS`: CPF/CNPJ duplicado.
- `DATABASE_ERROR`: falha ao acessar dados.
- `INTERNAL_ERROR`: erro inesperado.
- `AUTH_INVALID_CREDENTIALS`: login inválido com mensagem genérica.
- `AUTH_OFFLINE_UNAVAILABLE`: primeiro acesso offline indisponível.
- `AUTH_SESSION_EXPIRED`: sessão expirada.
- `AUTH_STORAGE_UNAVAILABLE`: armazenamento seguro indisponível.
- `AUTH_NOT_AUTHENTICATED`: operação exige autenticação.
- `AUTH_CONFIGURATION_ERROR`: Supabase Auth ausente ou inválido.
- `BACKUP_CREATE_FAILED`: falha ao criar backup.
- `BACKUP_RESTORE_FAILED`: falha ao restaurar backup.
- `BACKUP_INVALID_FILE`: arquivo selecionado não é backup válido.
- `BACKUP_INCOMPATIBLE_VERSION`: backup criado por versão incompatível.
- `BACKUP_OPERATION_IN_PROGRESS`: já há backup/restauração em andamento.
- `BACKUP_CANCELLED`: operação cancelada pelo usuário.
- `SYNC_NETWORK_UNAVAILABLE`: Supabase indisponível pela rede.
- `SYNC_AUTH_ERROR`: autenticação ou RLS rejeitou a operação.
- `SYNC_REMOTE_ERROR`: erro remoto sanitizado.
- `SYNC_VALIDATION_ERROR`: registro rejeitado por validação remota.
- `SYNC_DUPLICATE_TAX_ID`: CPF/CNPJ duplicado no destino remoto.
- `SYNC_OPERATION_IN_PROGRESS`: sincronização já em execução.
- `SYNC_DISABLED`: sincronização desabilitada.
- `SYNC_CONFIGURATION_ERROR`: configuração Supabase ausente ou inválida.
- `SYNC_CONFLICT`: alteração local e remota concorrentes.
- `SYNC_CONFLICT_NOT_FOUND`: conflito inexistente ou já resolvido.
- `SYNC_PULL_DISABLED`: recebimento remoto desabilitado por configuração.
- `UPDATE_DISABLED`: atualização automática desabilitada.
- `UPDATE_CHECK_FAILED`: falha sanitizada ao verificar atualização.
- `UPDATE_DOWNLOAD_FAILED`: falha sanitizada ao baixar atualização.
- `UPDATE_INSTALL_BLOCKED`: instalação bloqueada por operação crítica.
- `UPDATE_NOT_AVAILABLE`: não há atualização disponível para baixar.
- `UPDATE_NOT_DOWNLOADED`: instalação solicitada antes do download.

`details` só deve ser preservado quando vier de validação Zod e for seguro para o renderer.

## Segurança

- Usar `ipcMain.handle`, não `ipcMain.on`, para operações com resposta.
- Validar payloads no `main`, mesmo que o renderer valide antes.
- O preload expõe somente `window.clientDesk`.
- Não expor `ipcRenderer`, invoke genérico, canais arbitrários ou APIs de arquivo/shell/banco.
- Auth não expõe access token, refresh token, JWT, sessão Supabase completa, URL ou chave.
- Backup e restauração não retornam caminhos internos ao renderer.
- Sync não expõe URL, chaves, cliente Supabase ou fila completa ao renderer.
- Realtime não expõe canal, tópico, payload, socket ou token; o renderer recebe apenas `realtimeStatus`, `lastRealtimeEventAt` e `lastRealtimeConnectedAt` dentro de `SyncStatus`.
- Sync expõe somente resumo/detalhe de conflito necessários para resolução manual.
- Auditoria expõe apenas nomes de campos alterados e metadados sanitizados.
- Diagnóstico expõe apenas contadores, estados, versões, códigos e e-mail mascarado.
- Update não expõe `autoUpdater`, URL, token, provider, caminho de instalador, shell ou arquivo arbitrário.
- Remover handler anterior antes de registrar novo handler para evitar duplicidade em desenvolvimento e testes.

## Novo Canal

1. Adicionar o nome em `IPC_CHANNELS`.
2. Adicionar entrada e saída em `IpcContracts`.
3. Criar schema Zod de entrada no `shared` ou no módulo do `main`.
4. Registrar handler em `main`, validando antes de chamar o service.
5. Expor método específico no preload, sem invoke genérico.
6. Adicionar método ao client do renderer, se necessário.
7. Criar testes de contrato, handler, preload e client.
