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

Todos os nomes ficam centralizados em `src/shared/ipc/ipc-channels.ts`.

## Códigos de Erro

- `VALIDATION_ERROR`: dados inválidos.
- `CUSTOMER_NOT_FOUND`: cliente inexistente.
- `CUSTOMER_TAX_ID_ALREADY_EXISTS`: CPF/CNPJ duplicado.
- `DATABASE_ERROR`: falha ao acessar dados.
- `INTERNAL_ERROR`: erro inesperado.
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

`details` só deve ser preservado quando vier de validação Zod e for seguro para o renderer.

## Segurança

- Usar `ipcMain.handle`, não `ipcMain.on`, para operações com resposta.
- Validar payloads no `main`, mesmo que o renderer valide antes.
- O preload expõe somente `window.clientDesk`.
- Não expor `ipcRenderer`, invoke genérico, canais arbitrários ou APIs de arquivo/shell/banco.
- Backup e restauração não retornam caminhos internos ao renderer.
- Sync não expõe URL, chaves, cliente Supabase ou fila completa ao renderer.
- Remover handler anterior antes de registrar novo handler para evitar duplicidade em desenvolvimento e testes.

## Novo Canal

1. Adicionar o nome em `IPC_CHANNELS`.
2. Adicionar entrada e saída em `IpcContracts`.
3. Criar schema Zod de entrada no `shared` ou no módulo do `main`.
4. Registrar handler em `main`, validando antes de chamar o service.
5. Expor método específico no preload, sem invoke genérico.
6. Adicionar método ao client do renderer, se necessário.
7. Criar testes de contrato, handler, preload e client.
