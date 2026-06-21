# Plano de Desenvolvimento - ClientDesk

## Objetivo

Criar um aplicativo desktop local para cadastro e gerenciamento de clientes, usando Electron, React, TypeScript, SQLite e uma arquitetura segura entre `main`, `preload` e `renderer`.

O projeto deve iniciar com funcionamento para um único usuário em um único computador, sem dependência de internet em tempo de uso.

## Escopo Inicial

- Cadastrar, listar, pesquisar, visualizar e editar clientes.
- Ativar e inativar clientes, com confirmação antes da inativação.
- Manter clientes inativos disponíveis para consulta.
- Persistir todos os dados em SQLite local.
- Criar banco e aplicar migrations automaticamente na primeira execução.
- Exibir estados de carregamento, vazio, sucesso e erro.

## Etapas Propostas

### 1. Bootstrap do Projeto

- Criar projeto com `electron-vite`, React e TypeScript.
- Configurar TypeScript em modo `strict`.
- Configurar ESLint, Prettier e scripts `dev`, `build`, `lint`, `typecheck` e `test`.
- Configurar Vitest e Testing Library.
- Configurar electron-builder para Windows, mantendo alvos futuros para macOS e Linux.

### 2. Contratos Compartilhados - Concluído

- Criar `src/shared` com tipos, DTOs, contratos IPC e schemas Zod seguros.
- Evitar duplicação de tipos entre processos.
- Definir respostas padronizadas de sucesso e erro.

### 3. Banco e Migrations - Concluído

- Criar módulo de conexão SQLite no processo `main`.
- Salvar o arquivo do banco em subpasta de `app.getPath('userData')`.
- Habilitar `foreign_keys`, `busy_timeout` e avaliar `journal_mode = WAL`.
- Criar mecanismo simples de migrations SQL versionadas.
- Garantir fechamento da conexão ao encerrar o aplicativo.

### 4. Camada de Domínio no Main - Concluído

- Implementar schemas de validação no IPC e nos services.
- Criar `CustomerRepository` com prepared statements.
- Criar `CustomerService` com regras de negócio.
- Implementar tratamento centralizado de erros e logs com dados sensíveis mascarados.

Implementado nesta etapa:

- Tipos `PersonType`, `Customer`, `CreateCustomerInput`, `UpdateCustomerInput`, `CustomerSearchFilters` e `CustomerListResult`.
- Schemas Zod para cadastro, edição, ID e filtros.
- Normalização de CPF/CNPJ, telefone, CEP, e-mail, estado e campos opcionais vazios.
- `CustomerRepository` com create, busca, listagem, atualização e ativação/inativação lógica.
- `CustomerService` com UUID, timestamps, validação, duplicidade de CPF/CNPJ e erros de domínio.
- Testes de schemas, repository e service.

### 5. IPC e Preload

- Definir canais IPC explícitos.
- Expor API mínima e tipada via `contextBridge`.
- Manter `nodeIntegration: false` e `contextIsolation: true`.
- Não expor `ipcRenderer` diretamente ao `window`.

### 6. Interface React

- Criar layout com menu lateral simples.
- Criar página de clientes com busca, filtro por situação e tabela.
- Criar formulário de cadastro/edição com React Hook Form e Zod.
- Criar tela ou modal de detalhes.
- Exibir mensagens amigáveis para sucesso, erro, carregamento e lista vazia.

### 7. Testes

- Testar schemas Zod.
- Testar services de clientes.
- Testar repository com SQLite temporário.
- Testar componentes principais com Testing Library.
- Rodar `lint`, `typecheck`, `test` e `build` antes de considerar o incremento pronto.

## Scripts Planejados

Os scripts abaixo devem ser definidos quando o projeto for inicializado:

- `npm run dev`: inicia Electron em modo desenvolvimento via electron-vite.
- `npm run build`: compila renderer, preload e main.
- `npm run lint`: executa ESLint.
- `npm run typecheck`: executa checagem TypeScript sem emitir arquivos.
- `npm test`: executa Vitest.
- `npm run dist:win`: gera instalador Windows com electron-builder.

## Critérios de Aceite

- `main`, `preload`, `renderer` e `shared` estão claramente separados.
- O renderer não importa `fs`, `path`, SQLite, `better-sqlite3` ou módulos Node.js.
- Toda persistência de clientes passa pelo processo principal.
- Todos os dados recebidos via IPC são validados com Zod no `main`.
- CPF/CNPJ é salvo somente com dígitos.
- CPF/CNPJ duplicado é rejeitado quando informado.
- Pesquisa é case-insensitive.
- Listagem filtra ativos, inativos ou todos.
- Inativação exige confirmação na UI.
- Clientes não são removidos fisicamente no fluxo normal.
- Banco é criado automaticamente na primeira execução.
- Migrations são versionadas e aplicadas automaticamente.
- Testes cobrem schemas, services, repository e componentes principais.
- Logs não expõem CPF, CNPJ, e-mail ou telefone completos.
- README contém instruções de desenvolvimento.

## Fora do Escopo Inicial

- Sincronização em nuvem.
- Múltiplos usuários.
- Controle de permissões.
- Importação/exportação de dados.
- Backup automático.
- Integração com APIs externas.
