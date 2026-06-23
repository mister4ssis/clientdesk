# ClientDesk

Aplicativo desktop local para cadastro e gerenciamento de clientes.

## Requisitos

- Node.js compatível com Electron 42 e TypeScript 5.
- npm.
- Toolchain nativa disponível para reconstruir `better-sqlite3`.

## Desenvolvimento

Instale as dependências:

```bash
npm install
```

Execute em desenvolvimento:

```bash
npm run dev
```

Comandos úteis:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:watch
```

Empacotamento local:

```bash
npm run package:dir
npm run package:win
npm run verify:package
```

`better-sqlite3` é reconstruído por scripts do projeto. Use `npm test` para rodar a suíte, pois ele recompila o módulo para o runtime do Node antes do Vitest e recompila para Electron ao final.

Os artefatos de empacotamento são salvos em `release/`, que não deve ser commitado. Para detalhes de build, NSIS, módulo nativo e assinatura, consulte `PACKAGING.md`.

## Arquitetura

- `src/main`: Electron, SQLite, migrations, repositories, services e IPC.
- `src/preload`: `contextBridge` e API segura `window.clientDesk`.
- `src/renderer`: React, páginas, componentes, hooks e client do renderer.
- `src/shared`: tipos, DTOs, schemas Zod e contratos IPC.

O renderer não acessa Electron, `ipcRenderer`, SQLite, `fs`, `path` ou SQL. Toda persistência passa por IPC explícito, service e repository no processo principal.

## Banco de Dados

O banco SQLite fica em:

```text
path.join(app.getPath('userData'), 'data', 'clientdesk.sqlite')
```

Migrations SQL versionadas ficam em `src/main/database/migrations` e são incluídas no pacote via `electron-builder.yml`. Os testes usam banco em memória ou arquivo temporário, nunca o banco de desenvolvimento.

## Interface Atual

A interface React já possui layout principal, menu lateral com o item `Clientes` e página de listagem de clientes.

Fluxos implementados:

- carregar clientes via `customer-client`;
- pesquisar com debounce de 400 ms;
- filtrar por Ativos, Inativos ou Todos;
- formatar CPF/CNPJ e telefone apenas para apresentação;
- inativar e reativar clientes com confirmação;
- visualizar detalhes completos em `/customers/:id`;
- cadastrar cliente em `/customers/new`;
- editar cliente em `/customers/:id/edit`;
- validar formulário com React Hook Form, Zod e `@hookform/resolvers`;
- aplicar máscaras visuais de CPF/CNPJ, telefone e CEP sem persistir a máscara;
- normalizar CPF/CNPJ, telefone, CEP, e-mail, estado e campos opcionais antes do envio;
- confirmar cancelamento quando houver alterações não salvas;
- ativar e inativar clientes pela listagem ou pelos detalhes;
- tratar cliente inexistente com mensagem amigável e retorno para a listagem;
- exibir loading, atualização, erro e estados vazios.

Os componentes não acessam Electron, IPC, SQLite, `fs`, `path` ou SQL diretamente. A comunicação passa por `window.clientDesk.customers`, exposta pelo preload seguro.

Rotas disponíveis no renderer:

```text
/customers
/customers/new
/customers/:id
/customers/:id/edit
```

## Detalhes do Cliente

A página de detalhes exibe dados principais, contato, endereço, observações e
informações do cadastro. CPF/CNPJ, telefone, CEP e datas são formatados apenas
para leitura; o valor persistido continua normalizado. Valores opcionais vazios
aparecem como `Não informado`.

Ao editar a partir dos detalhes, o usuário retorna para `/customers/:id` após
salvar. A ativação e inativação usam confirmação, feedback de sucesso e mensagens
de erro sem stack trace, SQL ou caminhos locais.

## Testes

Os testes de interface usam Vitest, jsdom e Testing Library:

```bash
npm test -- tests/renderer
```

Os testes do renderer usam mocks de `customer-client.ts`; não inicializam Electron real e não acessam o banco.

Mais detalhes estão em `TESTING.md`.

## Documentos de Release

- `MVP_REVIEW.md`: achados da revisão do MVP.
- `PACKAGING.md`: configuração de pacote e instalador.
- `RELEASE_CHECKLIST.md`: checklist para validação e empacotamento.
- `TESTING.md`: estratégia e comandos de teste.

## Limitações Conhecidas

- Ainda não há backup automático.
- Ainda não há importação/exportação.
- Ainda não há teste E2E automatizado na janela Electron.
- Validação matemática de dígitos de CPF/CNPJ não faz parte do MVP atual.
- O instalador inicial não está assinado digitalmente.
- O ícone definitivo ainda está pendente em `resources/icon.ico` e `resources/icon.png`.
