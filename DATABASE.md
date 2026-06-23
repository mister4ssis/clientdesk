# Banco de Dados - ClientDesk

## Localização do Arquivo

O banco SQLite é aberto somente pelo processo principal do Electron. O caminho é resolvido por `getDatabasePath()` em `src/main/database/database-path.ts`:

```ts
path.join(app.getPath('userData'), 'data', 'clientdesk.sqlite')
```

Em desenvolvimento e produção, o arquivo fica dentro da pasta `userData` do Electron, nunca em `src`, `dist`, `resources`, na raiz do projeto ou ao lado do executável. Em testes, o caminho pode ser injetado ou substituído por banco em memória.

No aplicativo empacotado, `resources` contém apenas assets e migrations. O arquivo `clientdesk.sqlite` continua sendo criado em `app.getPath('userData')/data` na primeira execução.

## Conexão

A conexão é centralizada em `src/main/database/database.ts`:

- `openDatabase()`: abre uma única conexão e aplica pragmas.
- `getDatabase()`: retorna a conexão aberta.
- `closeDatabase()`: fecha a conexão e limpa a referência interna.

Pragmas configurados ao abrir:

```sql
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA journal_mode = WAL;
```

`journal_mode = WAL` é aplicado na abertura. Em banco em memória, o SQLite pode manter outro modo internamente, mas a configuração é executada.

Backups usam `database.backup()` do `better-sqlite3`, evitando cópia ingênua do arquivo principal enquanto WAL/SHM podem existir.

## Tabela `customers`

A migration inicial fica em `src/main/database/migrations/001-create-customers.sql` e cria:

```sql
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    person_type TEXT NOT NULL CHECK (person_type IN ('FISICA', 'JURIDICA')),
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    representative TEXT,
    tax_id TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    birth_date TEXT,
    postal_code TEXT,
    street TEXT,
    address_number TEXT,
    address_complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

`id` será UUID salvo como `TEXT`. Datas serão salvas em ISO 8601. `active` representa exclusão lógica e deve ser persistido como `0` ou `1`. CPF/CNPJ será salvo em `tax_id` somente com números.

## Repository

`CustomerRepository` fica em `src/main/modules/customers/customer.repository.ts` e recebe a conexão SQLite no construtor. Ele não abre novas conexões e usa prepared statements em todas as operações.

Operações implementadas:

- `create(input)`;
- `findById(id)`;
- `findByTaxId(taxId)`;
- `list(filters)`;
- `update(id, input)`;
- `setActive(id, active, updatedAt)`.

A listagem permite busca por `legal_name`, `trade_name`, `tax_id`, `email` e `phone`, com comparação case-insensitive nos campos textuais. O filtro `active` usa `0 | 1` no banco e `boolean` na aplicação. `limit` e `offset` são normalizados antes da consulta.

## Índices

A migration cria índices para listagem e pesquisa:

- `idx_customers_legal_name`
- `idx_customers_trade_name`
- `idx_customers_email`
- `idx_customers_phone`
- `idx_customers_active`

Não há índice simples adicional para `tax_id`, pois `UNIQUE` já cria índice no SQLite.

## Sincronização

A migration `002-add-representative-and-sync.sql` adiciona:

- `representative TEXT`;
- `sync_status TEXT NOT NULL DEFAULT 'PENDING'`;
- `last_synced_at TEXT`;
- `sync_error_code TEXT`;
- índices `idx_customers_representative` e `idx_customers_sync_status`;
- tabela `sync_outbox`.

`sync_outbox` armazena uma fila transacional para envio local -> Supabase. Ela não guarda payload permanente do cliente; o sincronizador sempre recarrega a versão atual de `customers`.

Clientes existentes após a migration começam como `PENDING`. O bootstrap idempotente cria itens de outbox para clientes pendentes sem duplicar registros.

## Migrations

O controle de migrations usa:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    executed_at TEXT NOT NULL
);
```

`runMigrations()` carrega arquivos `NNN-name.sql`, ordena por versão, ignora versões já executadas e aplica cada migration dentro de transação. A migration só é registrada após o SQL executar com sucesso. Em caso de erro, a transação é revertida e a inicialização deve ser interrompida.

Em produção, as migrations são copiadas pelo `electron-builder` para `process.resourcesPath/migrations` via `extraResources`.

Para adicionar uma migration:

1. Criar arquivo em `src/main/database/migrations/`, por exemplo `002-add-index.sql`.
2. Usar versão sequencial e nome descritivo.
3. Não alterar migrations já aplicadas.
4. Adicionar ou atualizar testes cobrindo a mudança.

## Inicialização

O `main` segue esta ordem:

1. `app.whenReady()`.
2. `openDatabase()`.
3. `runMigrations(database)`.
4. `registerIpcHandlers(ipcMain)`.
5. `createMainWindow()`.

A conexão é fechada no evento `before-quit`.

Durante restauração de backup, a conexão também é fechada temporariamente, o arquivo é substituído, o banco é reaberto e as migrations são executadas antes de o aplicativo voltar a usar a conexão.

## Backups

Backups escolhidos pelo usuário podem usar `.sqlite` ou `.clientdesk-backup`. Antes de restaurar, o arquivo é validado com `PRAGMA integrity_check`, presença de `schema_migrations`, presença de `customers`, colunas essenciais e versão de migrations compatível.

Antes de substituir o banco atual, o aplicativo cria uma cópia de segurança em:

```text
app.getPath('userData')/backups/before-restore-YYYY-MM-DD-HHmmss.sqlite
```

Esses backups automáticos não são removidos automaticamente nesta etapa.

## Testes

Os testes de banco e domínio usam banco em memória ou diretório temporário.

`tests/main/database/database.test.ts` cobre:

- abertura e fechamento da conexão;
- criação de `schema_migrations`;
- execução da migration `001`;
- existência da tabela `customers`;
- existência dos índices esperados;
- registro da migration executada;
- não reexecução de migration aplicada;
- rollback quando uma migration falha.

`tests/main/customers/customer.repository.test.ts` cobre create, find, listagem, busca, filtros, update, ativação/inativação e paginação.

`tests/main/customers/customer.service.test.ts` cobre validação, UUID, datas, duplicidade de CPF/CNPJ, busca por ID, atualização, ativação/inativação e erros de domínio.

`tests/shared/customers/customer.schemas.test.ts` cobre validações e normalizações Zod.
