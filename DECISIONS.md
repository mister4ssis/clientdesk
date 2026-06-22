# Decisões e Premissas - ClientDesk

## Ambiguidades Identificadas

- O formato visual de CPF/CNPJ, telefone e CEP não foi definido.
- Não há requisito de paginação na listagem inicial.
- Não há regra de validação matemática para CPF/CNPJ, apenas unicidade e armazenamento sem máscara.
- Não foi definido se e-mail deve ser único.
- Não foi definido se telefone deve aceitar múltiplos números.
- Não há requisito de histórico de alterações.
- Não há requisito de backup, exportação ou restauração.
- Não há definição final de idioma, mas o escopo está em português.
- Não há requisito de tema visual, acessibilidade detalhada ou responsividade fora do desktop.

## Decisões Assumidas

- A interface inicial será em português do Brasil.
- CPF/CNPJ será salvo apenas com dígitos, mas poderá ser exibido formatado na UI.
- A validação inicial de CPF/CNPJ será estrutural mínima e de unicidade; validação matemática poderá ser adicionada depois.
- E-mail não será único, salvo se uma regra futura exigir.
- Telefone será um único campo textual opcional.
- `id` será UUID gerado pela aplicação e armazenado como `TEXT`.
- Datas `createdAt` e `updatedAt` serão salvas em ISO 8601 UTC.
- `ativo` será booleano no domínio e inteiro `0 | 1` no SQLite.
- Inativar cliente não apagará nenhum dado.
- A busca consultará clientes ativos e inativos conforme filtro selecionado.
- A primeira versão não terá paginação; a query será preparada para receber `limit` e `offset` futuramente.
- O banco será salvo em `app.getPath('userData')/data/clientdesk.sqlite`.
- Migrations SQL ficarão versionadas no repositório em `src/main/database/migrations/`.
- A aplicação não dependerá de conexão com internet após instalada.
- CPF/CNPJ, telefone e CEP terão máscaras somente visuais no renderer; os DTOs enviados ao main continuam normalizados.
- A navegação do renderer usará History API nesta etapa, sem React Router, por haver apenas rotas simples de clientes.
- A edição retorna para a origem do fluxo: listagem quando iniciada pela listagem e detalhes quando iniciada por `/customers/:id`.

## Decisões de Stack

- `electron-vite` será usado para empacotar e desenvolver `main`, `preload` e `renderer`.
- `better-sqlite3` será usado por ser síncrono, simples e adequado para um app desktop local de usuário único.
- `Zod` será a fonte de validação para IPC e poderá ser reaproveitado pelo React Hook Form.
- `React Hook Form` será usado para performance e controle simples de formulários.
- `@hookform/resolvers` será usado para integrar Zod ao React Hook Form sem adaptador próprio.
- `Vitest` será usado para testes unitários e de componentes.
- `Testing Library` será usada para testar comportamento visível ao usuário.
- `electron-builder` será usado para empacotamento, com Windows como primeiro alvo.

## Decisões de Arquitetura

- O renderer nunca acessará banco, arquivos ou módulos Node.js.
- O preload será uma camada fina, sem regra de negócio.
- Repositories lidarão apenas com SQL e mapeamento de dados.
- Services concentrarão regras funcionais, validações de negócio e mensagens de domínio.
- Handlers IPC serão responsáveis por validar payloads e converter respostas.
- `shared` conterá somente contratos seguros, sem dependência de Electron ou Node.js.
- `window.clientDesk` é o único objeto exposto pelo preload.
- `ClientDeskApi` fica em `src/shared/ipc/ipc-contracts.ts`; a declaração global de `window.clientDesk` fica em `src/renderer/src/global.d.ts`, pois é o ponto onde o renderer consome a API e o arquivo entra nos dois tsconfigs.
- Handlers IPC removem o handler anterior antes de registrar um novo para reduzir duplicidade em testes e hot reload.
- `IpcResult<T>` usa `success` como discriminante público.
- O formulário usa um schema de apresentação no renderer para mensagens e máscaras, mas o processo principal continua validando com os schemas compartilhados antes de persistir.
- A página de detalhes reutiliza `useCustomerById` e os formatadores do renderer para manter apresentação consistente com listagem e formulário.

## Decisões de Qualidade

- TypeScript será configurado em modo `strict`.
- Não será usado `any`; quando necessário, tipos `unknown` serão refinados.
- `ts-ignore` só será aceito com justificativa local e específica.
- ESLint e Prettier serão configurados no início do projeto.
- Erros exibidos ao usuário serão amigáveis e sem detalhes técnicos.
- Logs técnicos deverão mascarar CPF/CNPJ, e-mail e telefone.

## Riscos Técnicos

- `better-sqlite3` é dependência nativa e precisa ser compatível com a versão do Electron.
- O empacotamento Windows deve validar rebuild das dependências nativas.
- Caminhos de migrations precisam funcionar tanto em desenvolvimento quanto no app empacotado.
- WAL pode ter comportamento diferente em alguns ambientes; será avaliado e testado.
- Como o banco é local, perda do arquivo implica perda dos dados se não houver backup futuro.
