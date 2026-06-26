# AGENTS.md

## 1. Visão geral

O **ClientDesk** é um aplicativo desktop para cadastro e gerenciamento local de clientes.

Características principais:

- funcionamento offline;
- execução em um único computador;
- persistência em SQLite;
- interface React;
- comunicação segura entre renderer e processo principal;
- banco manipulado somente no processo principal;
- empacotamento inicial para Windows.

Este arquivo define as regras que agentes de IA devem seguir ao analisar, criar ou alterar código no repositório.

---

## 2. Stack oficial

- Electron
- React
- TypeScript
- electron-vite
- SQLite
- better-sqlite3
- Zod
- React Hook Form
- Vitest
- Testing Library
- electron-builder
- ESLint
- Prettier

Não substituir a stack sem registrar a decisão em `docs/DECISIONS.md`.

---

## 3. Estrutura arquitetural

O projeto deve ser separado em quatro áreas:

```text
src/
├── main/
├── preload/
├── renderer/
└── shared/
```

### `src/main`

Responsável por:

- inicialização do Electron;
- criação e gerenciamento de janelas;
- acesso ao SQLite;
- migrations;
- repositories;
- services;
- handlers IPC;
- logging técnico;
- operações de arquivos;
- diálogos nativos;
- encerramento seguro do banco.

### `src/preload`

Responsável por:

- criar uma ponte segura com `contextBridge`;
- chamar canais IPC específicos;
- expor uma API mínima e tipada;
- não conter regras de negócio;
- não expor `ipcRenderer` diretamente.

### `src/renderer`

Responsável por:

- interface React;
- páginas;
- componentes;
- formulários;
- estado de interface;
- navegação;
- feedback visual;
- chamadas à API exposta pelo preload.

### `src/shared`

Responsável por:

- tipos compartilhados;
- DTOs;
- schemas Zod compartilháveis;
- contratos IPC;
- códigos públicos de erro;
- enums sem dependência de Electron, Node.js ou React.

---

## 4. Fronteiras obrigatórias

1. O renderer não pode importar `fs`, `path`, `os`, `child_process`, SQLite ou módulos nativos do Node.js.
2. O renderer não pode executar SQL.
3. O preload não deve conter regras de negócio.
4. O repository não deve conhecer Electron, React ou componentes de interface.
5. O service não deve depender de `BrowserWindow`, `ipcMain` ou APIs visuais.
6. Handlers IPC devem:
   - validar entrada;
   - chamar services;
   - converter resultado em contrato público;
   - tratar erros.
7. Toda entrada recebida via IPC deve ser validada novamente no processo principal.
8. Não confiar apenas na validação feita pelo formulário.
9. Não expor APIs genéricas de arquivo, shell, banco ou sistema operacional.
10. Não permitir que o renderer escolha ou manipule caminhos arbitrários.

---

## 5. Configuração de segurança do Electron

Manter, por padrão:

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath
}
```

Regras adicionais:

- não carregar conteúdo remoto;
- não usar `eval`;
- não desabilitar proteções de navegação sem justificativa;
- bloquear abertura de novas janelas não previstas;
- validar a origem do remetente quando necessário;
- não expor tokens, credenciais ou detalhes internos ao renderer;
- não retornar stack traces ao usuário.

Qualquer exceção deve ser documentada em `docs/DECISIONS.md`.

---

## 6. Banco de dados

- Utilizar SQLite com `better-sqlite3`.
- O banco deve ser aberto somente no processo principal.
- O caminho deve ser obtido por uma função centralizada.
- Em produção, salvar em uma subpasta de `app.getPath('userData')`.
- Em testes, permitir banco em memória ou arquivo temporário.
- Utilizar prepared statements.
- Não concatenar dados do usuário em SQL.
- Habilitar chaves estrangeiras.
- Configurar timeout de bloqueio.
- Avaliar e documentar o uso de WAL.
- Fechar corretamente a conexão no encerramento.
- Usar transações quando uma regra alterar mais de uma estrutura.
- Não alterar migrations já aplicadas.
- Cada alteração de estrutura deve gerar uma nova migration.
- Clientes não devem ser removidos fisicamente no fluxo normal.

### Sincronização offline-first

- Operações locais não podem depender da nuvem.
- Toda alteração sincronizável deve entrar na `sync_outbox` na mesma transação SQLite.
- Não chamar Supabase dentro de transações SQLite.
- Não expor Supabase, URL ou chaves ao renderer.
- Não utilizar `service_role` ou secret key no aplicativo desktop.
- Nunca expor access token, refresh token, JWT ou sessão Supabase completa ao renderer.
- Nunca salvar senha.
- Nunca criar cliente Supabase no renderer.
- Nunca executar sincronização remota sem usuário autenticado.
- Nunca abrir banco local de outro usuário.
- Toda consulta remota deve respeitar o proprietário do registro.
- Pull remoto só pode ser habilitado com Auth/RLS seguro e escopo por usuário ou organização.
- Alterações remotas aplicadas localmente não podem criar novo item na outbox.
- Conflitos devem ser registrados e resolvidos explicitamente, sem sobrescrever alterações concorrentes em silêncio.
- Testes padrão devem funcionar offline e com Supabase mockado.
- Nenhuma migration aplicada pode ser alterada.

---

## 7. Regras de domínio do cliente

Campos principais:

- `id`
- `personType`
- `legalName`
- `tradeName`
- `taxId`
- `email`
- `phone`
- `birthDate`
- endereço
- `notes`
- `active`
- `createdAt`
- `updatedAt`

Regras:

1. `personType` deve ser `FISICA` ou `JURIDICA`.
2. Nome ou razão social é obrigatório.
3. CPF/CNPJ deve ser salvo somente com números.
4. CPF deve possuir 11 dígitos quando associado a pessoa física.
5. CNPJ deve possuir 14 dígitos quando associado a pessoa jurídica.
6. CPF/CNPJ deve ser único quando informado.
7. E-mail deve ser normalizado com `trim` e `lowercase`.
8. Estado deve ser normalizado para letras maiúsculas.
9. Inativação deve ser lógica.
10. Clientes inativos permanecem consultáveis.
11. Regras devem ser verificadas no service e nas restrições do banco quando aplicável.

A validação dos dígitos verificadores de CPF/CNPJ pode ser introduzida no MVP desde que coberta por testes. Caso seja adiada, registrar em `docs/DECISIONS.md`.

---

## 8. TypeScript

- Utilizar `strict: true`.
- Não utilizar `any`.
- Preferir `unknown` com narrowing.
- Não usar `@ts-ignore` sem justificativa documentada.
- Não usar type assertion somente para esconder incompatibilidades.
- Não duplicar tipos entre main, preload e renderer.
- Diferenciar claramente:
  - entidade;
  - entrada;
  - filtro;
  - item de listagem;
  - resposta detalhada;
  - resultado IPC.

Nomes esperados:

- `Customer`
- `CreateCustomerInput`
- `UpdateCustomerInput`
- `CustomerSearchFilters`
- `CustomerListItem`
- `CustomerDetails`
- `SetCustomerActiveInput`

---

## 9. IPC

Os canais devem ser centralizados.

Canais iniciais:

```text
app:get-version
customers:create
customers:list
customers:get-by-id
customers:update
customers:set-active
```

Cada canal deve possuir:

- nome único;
- schema de entrada;
- tipo de saída;
- tratamento de erro;
- teste;
- documentação em `docs/IPC_CONTRACTS.md`.

Não expor `ipcRenderer` inteiro no objeto global.

---

## 10. React

- Componentes não devem conhecer SQL ou detalhes de IPC.
- Evitar uso direto de `window.clientDesk` em vários arquivos.
- Criar uma camada `customer-client`.
- Criar hooks para carregamento e mutações.
- Formulários devem utilizar React Hook Form e Zod.
- Exibir:
  - carregamento;
  - estado vazio;
  - sucesso;
  - erro;
  - confirmação de ação.
- Garantir labels e mensagens acessíveis.
- Evitar componentes grandes.
- Separar páginas, componentes, hooks, schemas visuais e serviços do renderer.
- Máscaras são apenas de apresentação; dados persistidos devem permanecer normalizados.

---

## 11. Tratamento de erros

Erros internos devem ser convertidos em erros públicos.

Códigos iniciais:

```text
VALIDATION_ERROR
CUSTOMER_NOT_FOUND
CUSTOMER_TAX_ID_ALREADY_EXISTS
DATABASE_ERROR
UNEXPECTED_ERROR
```

Regras:

- não enviar stack trace ao renderer;
- não mostrar detalhes de SQL ao usuário;
- não registrar CPF, CNPJ, e-mail, telefone ou endereço completos;
- mensagens ao usuário devem ser claras;
- logs técnicos devem possuir contexto suficiente sem expor dados pessoais.

---

## 12. Testes

Antes de concluir uma etapa, executar:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Cobertura mínima esperada:

- schemas;
- normalizadores;
- services;
- repositories;
- migrations;
- handlers IPC;
- formulário;
- listagem;
- detalhes;
- ativação e inativação.

Evitar testes dependentes de ordem. Cada teste deve preparar e limpar seus dados.

---

## 13. Git

Utilizar Conventional Commits:

```text
feat:
fix:
test:
refactor:
docs:
chore:
```

Não criar commits automaticamente sem solicitação.

Antes de concluir:

```bash
git status
git diff
```

Não incluir:

- banco com dados reais;
- `.env`;
- artefatos temporários;
- diretórios de build;
- logs;
- backups locais;
- dados pessoais.

---

## 14. Definição de pronto

Uma tarefa está pronta apenas quando:

1. o escopo solicitado foi implementado;
2. não foram adicionadas funcionalidades futuras sem solicitação;
3. a tipagem está correta;
4. entradas foram validadas;
5. testes relevantes foram criados;
6. lint, typecheck, testes e build foram executados;
7. o diff foi revisado;
8. documentação afetada foi atualizada;
9. limitações foram informadas;
10. não há dados pessoais nos logs ou fixtures.

---

## 15. Restrições para agentes

- Não implementar todo o projeto em uma única etapa.
- Não trocar a stack definida.
- Não adicionar servidor remoto no MVP.
- Não adicionar autenticação no MVP.
- Não adicionar sincronização em nuvem no MVP.
- Não adicionar atualização automática no MVP.
- Não criar abstrações sem uso concreto.
- Não realizar refatorações grandes fora do escopo.
- Não criar dependências novas sem justificar.
- Não alterar contratos públicos sem registrar impacto.
- Não fazer commit, push ou publicação sem solicitação explícita.
- Supabase Realtime é apenas gatilho para o pull incremental; nunca aplicar payload Realtime diretamente no SQLite.
- Nunca remover o polling periódico sem decisão arquitetural documentada.
- Todo canal Realtime deve ser privado, por usuário autenticado, e encerrado no logout.
- Nunca expor canal Realtime, tópico, token, socket ou cliente Supabase ao renderer.
- Testes padrão de sincronização e Realtime devem funcionar sem internet.
- Ao terminar, informar:
  - arquivos criados;
  - arquivos modificados;
  - dependências;
  - comandos executados;
  - resultados;
  - pendências.
