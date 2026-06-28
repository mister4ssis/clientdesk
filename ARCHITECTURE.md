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
│   │       ├── backup/
│   │       │   ├── backup.ipc.ts
│   │       │   ├── backup-path.ts
│   │       │   ├── backup-validator.ts
│   │       │   └── backup.service.ts
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
│   │       ├── global.d.ts
│   │       ├── main.tsx
│   │       ├── components/
│   │       │   ├── feedback/
│   │       │   └── layout/
│   │       ├── hooks/
│   │       ├── pages/
│   │       │   ├── customers/
│   │       │   │   ├── components/
│   │       │   │   ├── hooks/
│   │       │   │   ├── customer-formatters.ts
│   │       │   │   ├── CustomerCreatePage.tsx
│   │       │   │   ├── CustomerDetailsPage.tsx
│   │       │   │   ├── CustomerEditPage.tsx
│   │       │   │   └── CustomerListPage.tsx
│   │       │   └── settings/
│   │       ├── services/
│   │       │   ├── backup-client.ts
│   │       │   └── customer-client.ts
│   │       ├── styles/
│   │       └── utils/
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
window.clientDesk.backup.create()
window.clientDesk.backup.restore()
window.clientDesk.backup.validate()
window.clientDesk.sync.getStatus()
window.clientDesk.sync.runNow()
window.clientDesk.auth.getState()
window.clientDesk.auth.signIn(email, password)
window.clientDesk.auth.signOut()
window.clientDesk.auth.refreshSession()
```

Cada método chama um canal específico com `ipcRenderer.invoke`. Não há API genérica de invoke, `send`, acesso a arquivos, shell, banco ou módulos Node.js.

## Renderer

O renderer conterá a UI React:

- Tela de login com e-mail e senha.
- Menu lateral com item `Clientes`.
- Página de listagem com pesquisa e filtro `ativos`, `inativos` e `todos`.
- Formulário de cadastro/edição com React Hook Form.
- Página de detalhes.
- Confirmação antes de inativar.
- Mensagens amigáveis de erro e sucesso.

O renderer só conversa com o sistema local pela API exposta no `window.clientDesk`.

`src/renderer/src/services/customer-client.ts` encapsula `window.clientDesk.customers`, retorna `data` em caso de sucesso e converte falhas públicas em `ClientDeskClientError`.

`src/renderer/src/services/backup-client.ts` encapsula `window.clientDesk.backup`, sem expor caminhos internos ou APIs de arquivo.

`App.tsx` usa um roteamento leve baseado em History API para as rotas `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit` e `/settings/backup`. React Router não foi adicionado nesta etapa porque o fluxo atual exige poucas rotas locais e sem recursos avançados de navegação.

## Interface de Clientes

`CustomerListPage` monta a primeira tela funcional de clientes. Ela usa `useCustomerFilters` para controlar pesquisa e situação e `useCustomers` para carregar, recarregar e alterar a situação dos clientes.

Fluxo de carregamento:

- primeira carga exibe `LoadingState`;
- mudanças de pesquisa/filtro preservam a estrutura e mostram indicador de atualização;
- erros são convertidos para mensagens amigáveis;
- respostas antigas são descartadas por identificador incremental de requisição.

Filtros:

- `ACTIVE` envia `active: true`;
- `INACTIVE` envia `active: false`;
- `ALL` não envia `active`;
- pesquisa usa `trim` e debounce de 400 ms.

Ativação/inativação:

- ações por linha abrem `ConfirmDialog`;
- inativação informa que o cliente continuará armazenado;
- somente a linha em operação fica desabilitada;
- após sucesso, a lista é recarregada e um feedback é exibido.

Detalhes:

- `CustomerDetailsPage` carrega o cliente por ID via `useCustomerById`;
- a página organiza os dados em dados principais, contato, endereço, observações e informações do cadastro;
- valores ausentes são exibidos como `Não informado`;
- CPF/CNPJ, telefone, CEP e datas são formatados apenas para apresentação;
- datas de nascimento são exibidas como data e `createdAt`/`updatedAt` como data e horário em `pt-BR`;
- `CUSTOMER_NOT_FOUND` exibe estado próprio com retorno para a listagem;
- erros de banco e erros inesperados são convertidos para mensagens amigáveis e permitem tentar novamente;
- ativar e inativar pela página de detalhes usa confirmação, atualiza o estado local e não recarrega a janela inteira.

Cadastro e edição:

- `CustomerCreatePage` renderiza formulário vazio e salva via `createCustomer`;
- `CustomerEditPage` obtém o ID da rota, carrega dados via `getCustomerById` e salva via `updateCustomer`;
- `CustomerForm` compartilha as seções dados principais, contato, endereço, observações e situação;
- o formulário usa React Hook Form com Zod e `@hookform/resolvers`;
- campos `null` vindos do domínio são convertidos para string vazia nos inputs;
- CPF/CNPJ, telefone e CEP recebem máscara apenas visual e são enviados somente com dígitos;
- e-mail é enviado com `trim` e `lowercase`, estado com `uppercase` e campos opcionais vazios como `null`;
- ao cancelar com alterações, a UI exibe confirmação simples antes de sair;
- erros de negócio do `customer-client` são convertidos para mensagens amigáveis no renderer.
- quando a edição é aberta a partir dos detalhes, o salvamento retorna para `/customers/:id`;
- quando a edição é aberta a partir da listagem, o salvamento retorna para `/customers`.

## Backup e Restauração

`BackupService` fica no processo principal e é independente do módulo de clientes. Ele usa diálogos nativos para seleção de arquivos, `better-sqlite3` para criar backups consistentes e validação estrutural antes de qualquer restauração.

Durante a restauração, o serviço cria um backup automático em `app.getPath('userData')/backups`, fecha a conexão atual, substitui o arquivo, reabre o banco, executa migrations e registra novamente os handlers com services apontando para a nova conexão. Se houver falha após a substituição, o backup automático é restaurado.

## Sincronização Offline-First

O SQLite local é a fonte primária. Alterações em clientes são gravadas localmente e enfileiradas em `sync_outbox` na mesma transação. O Supabase é destino assíncrono local -> remoto e não participa da transação local.

`BackgroundSyncService` processa primeiro o push local e depois o pull remoto. O scheduler dispara na inicialização, em intervalo configurado e após gravações locais. Falhas remotas mantêm itens pendentes com backoff.

O pull remoto usa `CustomerPullService`, cursor incremental em `sync_cursors` e aplicação local por `applyRemoteCustomer()`, sem gerar nova outbox. Conflitos são registrados em `sync_conflicts` e resolvidos por `CustomerConflictService`.

Como não há fluxo de autenticação do usuário final no app, `SYNC_PULL_ENABLED=false` fica como padrão. O renderer só acessa status, execução manual e resolução de conflitos por `window.clientDesk.sync`; URL, chaves, cliente Supabase e RPC genérico nunca são expostos.

## Autenticação

`AuthService` roda no processo main e usa Supabase Auth com storage seguro próprio. O renderer recebe apenas `AuthState`.

Após autenticação, o app abre `app.getPath('userData')/users/<user-id>/clientdesk.sqlite`, executa migrations e registra os services de clientes/backup/sync para aquele usuário. Logout para scheduler, fecha o banco e substitui handlers por respostas autenticadas bloqueadas.

Em `OFFLINE_AUTHENTICATED`, o banco local é aberto para uso, mas a sincronização remota não executa.

## Canais IPC

Todos os canais são constantes em `src/shared/ipc/ipc-channels.ts`.

```text
app:get-version
customers:create
customers:update
customers:list
customers:get-by-id
customers:set-active
backup:create
backup:restore
backup:validate
sync:get-status
sync:run-now
sync:list-conflicts
sync:get-conflict
sync:resolve-keep-local
sync:resolve-use-remote
```

Cada handler IPC valida entrada com Zod no processo principal antes de chamar o service e retorna `IpcResult<T>`.

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
  representative?

CreateCustomerInput
  personType
  legalName
  campos opcionais do cliente

UpdateCustomerInput
  mesmos campos editáveis do cadastro

ListCustomersQuery
  search?
  active?
  limit?
  offset?

SetCustomerActiveInput
  id
  active
```

## Schemas Zod

Schemas compartilháveis serão definidos em `src/shared/customers/customer.schemas.ts`:

- `personTypeSchema`: enum `FISICA | JURIDICA`.
- `createCustomerSchema`: valida cadastro.
- `updateCustomerSchema`: valida edição.
- `customerSearchFiltersSchema`: valida busca, filtro e paginação.
- `customerIdSchema`: valida identificador.
- `customerDtoSchema`: valida saída quando necessário.

Regras principais:

- `personType` obrigatório.
- `legalName` obrigatório, com 2 a 200 caracteres.
- `taxId` normalizado para dígitos antes de persistir.
- CPF com 11 dígitos para pessoa física e CNPJ com 14 para pessoa jurídica.
- `email` válido quando informado.
- `email` normalizado com `trim` e `lowercase`.
- `phone` e `postalCode` normalizados para dígitos.
- `state` normalizado em maiúsculas e com exatamente duas letras quando informado.
- Campos opcionais vazios convertidos para `null`.

## Domínio de Clientes

`CustomerRepository` recebe a conexão `better-sqlite3` por injeção e não abre banco. Ele usa prepared statements, mapeia `snake_case` para `camelCase`, implementa busca case-insensitive por nome, nome fantasia e e-mail, busca por CPF/CNPJ e telefone normalizados, filtro por `active`, paginação com `limit`/`offset` e ordenação por `legal_name`.

`CustomerService` não depende de Electron e não executa SQL. Ele valida entradas com Zod, gera UUID com `crypto.randomUUID()`, define datas ISO 8601 com `new Date().toISOString()`, verifica duplicidade de CPF/CNPJ no cadastro e na edição, preserva `createdAt` e atualiza `updatedAt` em edição e ativação/inativação.

## Tratamento de Erros

O `main` usa `ApplicationError` com código seguro para UI. Handlers IPC transformam exceções em respostas controladas via `toIpcFailure`.

Erros técnicos são registrados de forma sanitizada. A UI recebe mensagens amigáveis, sem stack trace, SQL bruto ou caminhos locais.

## Segurança

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Sem acesso direto do renderer a módulos Node.js.
- Sem uso de `localStorage` para clientes.
- IPC com canais explícitos.
- Validação no main, mesmo havendo validação no formulário.
- Prepared statements para todas as consultas SQL.

## Realtime

Supabase Realtime é usado somente como gatilho de pull incremental. O trigger PostgreSQL publica Broadcast privado no tópico `user:<user-id>:customers`; o processo main assina o canal com a sessão autenticada e solicita `BackgroundSyncService.requestSync({ reason: 'REALTIME_EVENT' })`.

O payload Realtime nunca é aplicado diretamente no SQLite. O polling periódico e a sincronização manual continuam usando o mesmo ciclo como fallback e recuperação.

## Auditoria e Diagnóstico

Alterações de clientes gravam auditoria local sanitizada em `customer_audit_log`. O histórico registra operação, origem e nomes de campos alterados, sem valores pessoais.

Ciclos de sincronização gravam `sync_run_log` com motivo, status, contadores, duração e código de erro. Esse log é observacional: falha ao gravá-lo não pode derrubar sincronização nem desfazer alterações.

A rota `/settings/diagnostics` e a exportação de diagnóstico usam dados agregados e sanitizados. O renderer não recebe banco, paths internos, tokens, chaves, payloads, outbox completa ou snapshots de conflito.

## Release e Atualizações

O pipeline Windows gera artifacts em CI e publica releases somente por tag validada. A assinatura digital é configurada por secrets da pipeline; o repositório não contém certificado, senha ou chave.

`electron-updater` roda somente no processo main, em `src/main/modules/update`. O preload expõe apenas métodos específicos em `window.clientDesk.update`, e o renderer recebe somente `UpdateState` sanitizado.

Antes de instalar uma atualização, `UpdateLifecycleService` verifica operações críticas. Instalação é bloqueada durante backup, restauração, migration, sincronização ou resolução de conflito. O banco SQLite permanece em `userData`, é fechado antes do `quitAndInstall()` e migrations locais são validadas na próxima abertura.
