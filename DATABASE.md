# Banco de Dados - ClientDesk

## Localização do Arquivo

O banco SQLite é aberto somente pelo processo principal do Electron. O caminho é resolvido por `getDatabasePath()` em `src/main/database/database-path.ts`:

```ts
path.join(app.getPath('userData'), 'data', 'clientdesk.sqlite')
```

Em desenvolvimento e produção, o arquivo fica dentro da pasta `userData` do Electron, nunca em `src`, `dist`, `resources`, na raiz do projeto ou ao lado do executável. Em testes, o caminho pode ser injetado ou substituído por banco em memória.

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

## Tabela `customers`

A migration inicial fica em `src/main/database/migrations/001-create-customers.sql` e cria:

```sql
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    person_type TEXT NOT NULL CHECK (person_type IN ('FISICA', 'JURIDICA')),
    legal_name TEXT NOT NULL,
    trade_name TEXT,
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
