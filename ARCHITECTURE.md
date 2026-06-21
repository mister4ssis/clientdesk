# Arquitetura - ClientDesk

## Visão Geral

ClientDesk será um aplicativo Electron com React e TypeScript, executando localmente e persistindo dados em SQLite. A aplicação será dividida em quatro áreas:

- `src/main`: Electron main process, banco, migrations, repositories, services e handlers IPC.
- `src/preload`: `contextBridge` e API segura exposta ao renderer.
- `src/renderer`: React, páginas, componentes, formulários e estado de interface.
- `src/shared`: tipos, DTOs, contratos IPC e schemas que não dependem de Electron ou Node.js.

## Estrutura de Diretórios Planejada

```text
.
├── resources/
├── scripts/
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── windows/
│   │   │   └── main-window.ts
│   │   ├── database/
│   │   │   ├── database.ts
│   │   │   ├── database-path.ts
│   │   │   ├── migration-runner.ts
│   │   │   └── migrations/
│   │   │       └── 001-create-customers.sql
│   │   ├── errors/
│   │   │   ├── application-error.ts
│   │   │   └── error-codes.ts
│   │   ├── ipc/
│   │   │   ├── ipc-error-handler.ts
│   │   │   └── register-ipc-handlers.ts
│   │   └── modules/
│   │       └── customers/
│   │           ├── customer.ipc.ts
│   │           ├── customer.mapper.ts
│   │           ├── customer.repository.ts
│   │           └── customer.service.ts
│   ├── preload/
│   │   ├── clientdesk-api.ts
│   │   └── index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       │   └── customers/
│   │       ├── services/
│   │       └── styles/
│   └── shared/
│       ├── customers/
│       │   ├── customer.dto.ts
│       │   ├── customer.schemas.ts
│       │   └── customer.types.ts
│       ├── errors/
│       │   └── public-error.ts
│       ├── ipc/
│       │   ├── ipc-channels.ts
│       │   ├── ipc-contracts.ts
│       │   └── ipc-result.ts
├── tests/
│   ├── fixtures/
│   ├── helpers/
│   ├── main/
│   └── setup/
└── package.json
```

## Processo Main

O processo `main` será responsável por inicializar o Electron, criar janelas, abrir o banco, aplicar migrations, registrar handlers IPC e encerrar recursos corretamente.

Somente o `main` poderá acessar SQLite, `better-sqlite3`, `fs`, `path` e `app.getPath('userData')`.

## Processo Preload

O `preload` expõe uma API mínima e tipada via `contextBridge`. Ele não contém regra de negócio e não expõe `ipcRenderer` diretamente.

API planejada:

```ts
window.clientDesk.customers.create(input)
window.clientDesk.customers.update(id, input)
window.clientDesk.customers.list(query)
window.clientDesk.customers.getById(id)
window.clientDesk.customers.setActive(id, active)
```

## Renderer

O renderer conterá a UI React:

- Menu lateral com item `Clientes`.
- Página de listagem com pesquisa e filtro `ativos`, `inativos` e `todos`.
- Formulário de cadastro/edição com React Hook Form.
- Modal ou página de detalhes.
- Confirmação antes de inativar.
- Mensagens amigáveis de erro e sucesso.

O renderer só conversa com o sistema local pela API exposta no `window.clientDesk`.

## Canais IPC

Todos os canais serão constantes em `src/shared/ipc/channels.ts`.

```text
customers:create
customers:update
customers:list
customers:get-by-id
customers:set-active
```

Cada handler IPC validará entrada com Zod no processo principal antes de chamar o service.

## DTOs

```text
CustomerDTO
  id
  personType
  legalName
  tradeName?
  taxId?
  email?
  phone?
  birthDate?
  postalCode?
  street?
  addressNumber?
  addressComplement?
  neighborhood?
  city?
  state?
  notes?
  active
  createdAt
  updatedAt

CreateCustomerInput
  personType
  legalName
  campos opcionais do cliente

UpdateCustomerInput
  mesmos campos editáveis do cadastro

ListCustomersQuery
  search?
  status: "active" | "inactive" | "all"

SetCustomerActiveInput
  id
  active
```

## Schemas Zod

Schemas compartilháveis serão definidos em `src/shared/customers/customer.schemas.ts`:

- `personTypeSchema`: enum `FISICA | JURIDICA`.
- `createCustomerSchema`: valida cadastro.
- `updateCustomerSchema`: valida edição.
- `listCustomersQuerySchema`: valida busca e filtro.
- `customerIdSchema`: valida identificador.
- `setCustomerActiveSchema`: valida ativação/inativação.
- `customerDtoSchema`: valida saída quando necessário.

Regras principais:

- `personType` obrigatório.
- `legalName` obrigatório e sem string vazia.
- `taxId` normalizado para dígitos antes de persistir.
- `email` válido quando informado.
- `estado` com exatamente duas letras quando informado.

## Tratamento de Erros

O `main` terá erro de domínio padronizado, por exemplo `AppError`, com código seguro para UI. Handlers IPC transformarão exceções em respostas controladas.

Erros técnicos serão registrados com dados sensíveis mascarados. A UI receberá mensagens amigáveis, sem stack trace.

## Segurança

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Sem acesso direto do renderer a módulos Node.js.
- Sem uso de `localStorage` para clientes.
- IPC com canais explícitos.
- Validação no main, mesmo havendo validação no formulário.
- Prepared statements para todas as consultas SQL.
