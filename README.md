# ClientDesk

Aplicativo desktop local para cadastro e gerenciamento de clientes.

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
```

## Interface Atual

A interface React já possui layout principal, menu lateral com o item `Clientes` e página de listagem de clientes.

Fluxos implementados:

- carregar clientes via `customer-client`;
- pesquisar com debounce de 400 ms;
- filtrar por Ativos, Inativos ou Todos;
- formatar CPF/CNPJ e telefone apenas para apresentação;
- inativar e reativar clientes com confirmação;
- cadastrar cliente em `/customers/new`;
- editar cliente em `/customers/:id/edit`;
- validar formulário com React Hook Form, Zod e `@hookform/resolvers`;
- aplicar máscaras visuais de CPF/CNPJ, telefone e CEP sem persistir a máscara;
- normalizar CPF/CNPJ, telefone, CEP, e-mail, estado e campos opcionais antes do envio;
- confirmar cancelamento quando houver alterações não salvas;
- exibir loading, atualização, erro e estados vazios.

Os componentes não acessam Electron, IPC, SQLite, `fs`, `path` ou SQL diretamente. A comunicação passa por `window.clientDesk.customers`, exposta pelo preload seguro.

Rotas disponíveis no renderer:

```text
/customers
/customers/new
/customers/:id/edit
```

## Testes do Renderer

Os testes de interface usam Vitest, jsdom e Testing Library:

```bash
npm test -- tests/renderer
```

Os testes do renderer usam mocks de `customer-client.ts`; não inicializam Electron real e não acessam o banco.
