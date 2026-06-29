# ClientDesk

Aplicativo desktop local para cadastro e gerenciamento de clientes.

Versão de homologação atual: `0.9.0-rc.1`.

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

Sincronização Supabase é opcional e desabilitada por padrão:

```bash
cp .env.example .env
```

Preencha apenas `MAIN_VITE_SUPABASE_URL` e `MAIN_VITE_SUPABASE_PUBLISHABLE_KEY` quando houver Auth/RLS seguro. Essas variáveis são destinadas ao processo main; não use variáveis `RENDERER_VITE_*` nem chaves `service_role` no aplicativo desktop.

Empacotamento local:

```bash
npm run package:dir
npm run package:win
npm run release:check
npm run test:integration
npm run test:package
npm run verify:package
```

`better-sqlite3` é reconstruído por scripts do projeto. Use `npm test` para rodar a suíte, pois ele recompila o módulo para o runtime do Node antes do Vitest e recompila para Electron ao final.

Os artefatos de empacotamento são salvos em `release/`, que não deve ser commitado. Para detalhes de build, NSIS, módulo nativo, assinatura e updater, consulte `PACKAGING.md`, `RELEASE_PROCESS.md`, `CODE_SIGNING.md` e `AUTO_UPDATE.md`.

## Arquitetura

- `src/main`: Electron, SQLite, migrations, repositories, services e IPC.
- `src/preload`: `contextBridge` e API segura `window.clientDesk`.
- `src/renderer`: React, páginas, componentes, hooks e client do renderer.
- `src/shared`: tipos, DTOs, schemas Zod e contratos IPC.

O renderer não acessa Electron, `ipcRenderer`, SQLite, `fs`, `path` ou SQL. Toda persistência passa por IPC explícito, service e repository no processo principal.

## Autenticação

O ClientDesk usa Supabase Auth com e-mail e senha. A sessão é armazenada no processo main com `safeStorage`; tokens nunca são enviados ao renderer.

Cada usuário possui um banco local separado em:

```text
app.getPath('userData')/users/<user-id>/clientdesk.sqlite
```

Um usuário previamente autenticado pode usar o app offline com seus dados locais. O primeiro acesso exige conexão.

## Banco de Dados

Com autenticação habilitada, o banco SQLite fica isolado por usuário:

```text
app.getPath('userData')/users/<user-id>/clientdesk.sqlite
```

O caminho legado `app.getPath('userData')/data/clientdesk.sqlite` pode existir em instalações anteriores e não deve ser associado automaticamente a uma conta.

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
- criar e restaurar backup local em `/settings/backup`;
- informar estado básico de sincronização e permitir "Sincronizar agora" em `/settings/backup`;
- listar e resolver conflitos de sincronização em `/settings/sync/conflicts`;
- visualizar histórico sanitizado no detalhe do cliente;
- abrir diagnóstico de sincronização em `/settings/diagnostics`;
- exportar pacote JSON de diagnóstico sanitizado;
- verificar, baixar e instalar atualizações pela área de Configurações quando o updater estiver habilitado;
- cadastrar, listar, pesquisar e visualizar o campo Representante;
- tratar cliente inexistente com mensagem amigável e retorno para a listagem;
- exibir loading, atualização, erro e estados vazios.

Os componentes não acessam Electron, IPC, SQLite, `fs`, `path` ou SQL diretamente. A comunicação passa por `window.clientDesk.customers`, exposta pelo preload seguro.

Rotas disponíveis no renderer:

```text
/customers
/customers/new
/customers/:id
/customers/:id/edit
/settings/backup
/settings/sync/conflicts
/settings/diagnostics
```

## Detalhes do Cliente

A página de detalhes exibe dados principais, contato, endereço, observações e
informações do cadastro. CPF/CNPJ, telefone, CEP e datas são formatados apenas
para leitura; o valor persistido continua normalizado. Valores opcionais vazios
aparecem como `Não informado`.

Ao editar a partir dos detalhes, o usuário retorna para `/customers/:id` após
salvar. A ativação e inativação usam confirmação, feedback de sucesso e mensagens
de erro sem stack trace, SQL ou caminhos locais.

A seção `Histórico` mostra ações, origem, nomes dos campos alterados, data e
instalação abreviada. Ela não mostra valores antigos, valores novos, JSON bruto
ou identificadores completos.

## Testes

Os testes de interface usam Vitest, jsdom e Testing Library:

```bash
npm test -- tests/renderer
```

Os testes do renderer usam mocks de `customer-client.ts`; não inicializam Electron real e não acessam o banco.

Mais detalhes estão em `TESTING.md`.

## Backup Local

A página `/settings/backup` permite criar backup local e restaurar um arquivo validado. A restauração cria uma cópia de segurança automática do banco atual em `app.getPath('userData')/backups`.

Consulte `BACKUP.md` para detalhes de validação, recuperação em caso de falha e limitações.

## Sincronização Supabase

A sincronização é offline-first: o cliente é salvo no SQLite, a alteração entra em `sync_outbox` e o envio para Supabase ocorre em segundo plano. A infraestrutura bidirecional inclui cursor incremental, RPC com controle de versão e resolução manual de conflitos.

Por segurança, `SYNC_PULL_ENABLED=false` é o padrão até existir sessão autenticada e RLS validado no Supabase.

Supabase Realtime pode ser usado como gatilho para iniciar o pull incremental rapidamente. O polling periódico continua ativo como fallback, e o payload Realtime nunca é aplicado diretamente no SQLite.

Com `MAIN_VITE_SYNC_ENABLED=false`, o app opera normalmente sem internet. Consulte:

- `SYNC.md`: arquitetura, outbox, retry e limitações.
- `REALTIME_SYNC.md`: Broadcast privado, lifecycle do canal, debounce e fallback por polling.
- `AUTH.md`: login, sessão segura, estados e logout.
- `LOCAL_USER_PROFILES.md`: isolamento local por usuário e modo offline.
- `BIDIRECTIONAL_SYNC.md`: cursor, pull incremental, versionamento e exclusão lógica.
- `CONFLICT_RESOLUTION.md`: detecção e resolução manual de conflitos.
- `MULTI_INSTANCE_TESTING.md`: testes com duas instalações e bancos locais isolados.
- `SYNC_VALIDATION_REPORT.md`: cenários de sincronização validados e riscos restantes.
- `SUPABASE.md`: variáveis, tabela remota e migration.
- `SUPABASE_SECURITY.md`: chaves permitidas, RLS/Auth e riscos.

## Documentos de Release

- `MVP_REVIEW.md`: achados da revisão do MVP.
- `BACKUP.md`: fluxo de backup e restauração local.
- `SYNC.md`: fluxo de sincronização offline-first.
- `SUPABASE.md`: configuração e migration remota.
- `SUPABASE_SECURITY.md`: regras de segurança Supabase.
- `PACKAGING.md`: configuração de pacote e instalador.
- `RELEASE_PROCESS.md`: versionamento de release, workflows e artifacts.
- `CODE_SIGNING.md`: preparação de assinatura Windows sem secrets no repositório.
- `AUTO_UPDATE.md`: updater, IPC, bloqueios de instalação e preservação de dados.
- `VERSIONING.md`: SemVer, tags e compatibilidade.
- `RELEASE_CANDIDATE_TEST_PLAN.md`: matriz e cenários para homologar `0.9.0-rc.1`.
- `RELEASE_CANDIDATE_REPORT.md`: relatório inicial da RC.
- `KNOWN_ISSUES.md`: issues conhecidas e severidade.
- `GO_LIVE_CHECKLIST.md`: checklist de aprovação para 1.0.0.
- `RELEASE_CHECKLIST.md`: checklist para validação e empacotamento.
- `TESTING.md`: estratégia e comandos de teste.
- `MULTI_INSTANCE_TESTING.md`: execução e isolamento de testes de sincronização.
- `SYNC_VALIDATION_REPORT.md`: resultado da validação multi-instância.
- `REALTIME_SYNC.md`: Realtime como gatilho de sincronização.
- `AUDIT.md`: auditoria local sanitizada de alterações de clientes.
- `DIAGNOSTICS.md`: resumo e exportação segura de diagnóstico.
- `LOGGING_AND_PRIVACY.md`: regras de logs e privacidade.

## Limitações Conhecidas

- Ainda não há backup automático.
- A autenticação não inclui cadastro público, recuperação de senha, MFA ou OAuth.
- Não há merge automático campo a campo em conflitos.
- Ainda não há importação/exportação.
- Ainda não há teste E2E automatizado na janela Electron.
- Validação matemática de dígitos de CPF/CNPJ não faz parte do MVP atual.
- O instalador inicial não está assinado digitalmente.
- Atualizações automáticas permanecem desabilitadas por padrão até assinatura e provider serem homologados.
- O ícone definitivo ainda está pendente em `resources/icon.ico` e `resources/icon.png`.
