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

### 5. IPC e Preload - Concluído

- Definir canais IPC explícitos.
- Expor API mínima e tipada via `contextBridge`.
- Manter `nodeIntegration: false` e `contextIsolation: true`.
- Não expor `ipcRenderer` diretamente ao `window`.

Implementado nesta etapa:

- Contratos IPC compartilhados em `src/shared/ipc`.
- Resultado padronizado `IpcResult<T>` com união por `success`.
- Handlers `ipcMain.handle` para create, list, getById, update e setActive.
- Conversão centralizada de erros internos para erros públicos.
- API segura `window.clientDesk.customers` exposta pelo preload.
- Camada `customer-client` no renderer para consumir a API tipada.
- Testes de contratos, handlers, preload e client do renderer.

### 6. Interface React - Concluído

- Criar layout com menu lateral simples.
- Criar página de clientes com busca, filtro por situação e tabela.
- Criar formulário de cadastro/edição com React Hook Form e Zod.
- Criar tela ou modal de detalhes.
- Exibir mensagens amigáveis para sucesso, erro, carregamento e lista vazia.

Implementado nesta etapa:

- Layout principal com menu lateral e área de conteúdo.
- Página de listagem de clientes com pesquisa, filtro por situação e tabela.
- Rotas internas `/customers`, `/customers/new` e `/customers/:id/edit`.
- Debounce de pesquisa de 400 ms.
- Filtro inicial em clientes ativos.
- Estados de loading, atualização, erro e lista vazia.
- Ativação e inativação com confirmação e feedback.
- Formulário compartilhado de cadastro e edição com React Hook Form, Zod e `@hookform/resolvers`.
- Máscaras visuais para CPF, CNPJ, telefone e CEP, removidas antes do envio.
- Normalização de e-mail, estado, campos opcionais e documentos fiscais antes de chamar o client.
- Carregamento de cliente na edição com retry e tratamento de cliente inexistente.
- Confirmação ao cancelar formulário alterado.
- Página de detalhes em `/customers/:id` com dados completos organizados por seção.
- Navegação da listagem para visualizar, editar, ativar e inativar clientes.
- Ativação e inativação também disponíveis nos detalhes, com confirmação e feedback.
- Tratamento de cliente inexistente e erros de carregamento sem expor mensagens técnicas.
- Client do renderer encapsulado em `customer-client`.
- Testes de formatadores, hooks, listagem, formulário, cadastro, edição e detalhes.

### 7. Testes

- Testar schemas Zod.
- Testar services de clientes.
- Testar repository com SQLite temporário.
- Testar componentes principais com Testing Library.
- Rodar `lint`, `typecheck`, `test` e `build` antes de considerar o incremento pronto.

### 8. Revisão e Estabilização do MVP - Concluído

- Revisar arquitetura, segurança, banco, erros, interface e dependências.
- Criar documentação de revisão, testes e checklist de release.
- Adicionar fixtures reutilizáveis.
- Adicionar teste integrado `CustomerService -> CustomerRepository -> SQLite` com arquivo temporário.
- Adicionar teste de fumaça para arquivos essenciais e scripts.
- Preparar scripts de empacotamento `package`, `package:dir` e `package:win`.

### 9. Empacotamento - Concluído

- Configurar `electron-builder`.
- Gerar pacote em diretório com `package:dir`.
- Preparar build Windows NSIS x64.
- Documentar limitações de assinatura e build Windows com dependência nativa.

### 10. Backup e Restauração Local - Concluído

- Criar backup com diálogo nativo e `better-sqlite3.backup()`.
- Validar backups antes de restauração.
- Criar backup automático antes de substituir o banco.
- Reabrir conexão e registrar services após restauração.
- Adicionar página `/settings/backup` e item Configurações no menu.
- Cobrir validator, service, IPC, preload, client e UI com testes.

### 11. Sincronização Offline-First com Supabase - Em andamento

- Adicionar campo Representante ao cadastro, listagem, pesquisa e detalhes.
- Criar migration local `002` com campos de sincronização e `sync_outbox`.
- Registrar alterações locais na outbox de forma transacional.
- Criar infraestrutura main-only para Supabase, desabilitada por padrão.
- Expor IPC específico `sync:get-status` e `sync:run-now`.
- Adicionar seção de sincronização em `/settings/backup`.
- Criar migration remota Supabase sem policies públicas permissivas.

### 12. Sincronização Bidirecional com Conflitos - Concluído parcialmente

- Criar migration local `003` com metadados remotos, cursor incremental e conflitos.
- Criar migration Supabase com `user_id`, `version`, `deleted_at`, trigger de versionamento, RLS e RPC versionada.
- Enviar alterações locais por RPC com controle otimista.
- Baixar alterações remotas por cursor composto quando `SYNC_PULL_ENABLED=true`.
- Aplicar alterações remotas sem criar outbox.
- Registrar conflitos quando houver pendência local e versão remota mais nova.
- Expor IPC/preload/client do renderer para listar e resolver conflitos.
- Criar página `/settings/sync/conflicts` para manter versão local ou usar versão remota.

Bloqueio mantido: `SYNC_PULL_ENABLED=false` é o padrão até existir autenticação de usuário final e RLS validado em ambiente Supabase seguro.

Próximo passo: implementar fluxo de autenticação Supabase seguro ou validar a implantação Auth/RLS antes de habilitar pull remoto em produção.

## Scripts Planejados

Os scripts abaixo devem ser definidos quando o projeto for inicializado:

- `npm run dev`: inicia Electron em modo desenvolvimento via electron-vite.
- `npm run build`: compila renderer, preload e main.
- `npm run lint`: executa ESLint.
- `npm run typecheck`: executa checagem TypeScript sem emitir arquivos.
- `npm test`: executa Vitest.
- `npm run test:watch`: executa Vitest em modo observação.
- `npm run package`: executa build e empacotamento padrão do electron-builder.
- `npm run package:dir`: gera diretório empacotado sem instalador.
- `npm run package:win`: gera pacote Windows.
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

- Múltiplos usuários.
- Controle de permissões.
- Importação/exportação de dados.
- Backup automático.
- Integração com APIs externas.
