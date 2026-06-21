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

Todos os nomes ficam centralizados em `src/shared/ipc/ipc-channels.ts`.

## Códigos de Erro

- `VALIDATION_ERROR`: dados inválidos.
- `CUSTOMER_NOT_FOUND`: cliente inexistente.
- `CUSTOMER_TAX_ID_ALREADY_EXISTS`: CPF/CNPJ duplicado.
- `DATABASE_ERROR`: falha ao acessar dados.
- `INTERNAL_ERROR`: erro inesperado.

`details` só deve ser preservado quando vier de validação Zod e for seguro para o renderer.

## Segurança

- Usar `ipcMain.handle`, não `ipcMain.on`, para operações com resposta.
- Validar payloads no `main`, mesmo que o renderer valide antes.
- O preload expõe somente `window.clientDesk`.
- Não expor `ipcRenderer`, invoke genérico, canais arbitrários ou APIs de arquivo/shell/banco.
- Remover handler anterior antes de registrar novo handler para evitar duplicidade em desenvolvimento e testes.

## Novo Canal

1. Adicionar o nome em `IPC_CHANNELS`.
2. Adicionar entrada e saída em `IpcContracts`.
3. Criar schema Zod de entrada no `shared` ou no módulo do `main`.
4. Registrar handler em `main`, validando antes de chamar o service.
5. Expor método específico no preload, sem invoke genérico.
6. Adicionar método ao client do renderer, se necessário.
7. Criar testes de contrato, handler, preload e client.
