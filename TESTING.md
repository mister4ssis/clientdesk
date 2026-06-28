# Testes - ClientDesk

## Comandos

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run test:watch` durante desenvolvimento.

## Observação sobre better-sqlite3

`better-sqlite3` é um módulo nativo. O script `npm test` executa `npm rebuild better-sqlite3` antes do Vitest para usar o ABI do Node e, no `posttest`, executa `npm run rebuild:electron` para restaurar o ABI usado pelo Electron.

Evite rodar `npx vitest` diretamente após executar Electron ou após o `posttest`; se necessário, rode primeiro:

```bash
npm rebuild better-sqlite3
```

## Cobertura Atual

- `tests/shared`: schemas Zod e contratos IPC.
- `tests/main/database`: abertura, pragmas, migrations, rollback e fechamento.
- `tests/main/customers`: repository, service e integração com SQLite temporário.
- `tests/main/ipc`: handlers IPC, validação e sanitização de erros.
- `tests/main/audit`: auditoria de clientes, paginação, retenção e IPC.
- `tests/main/diagnostics`: resumo sanitizado, IPC e histórico de ciclos.
- `tests/integration/sync`: sincronização bidirecional entre duas instalações SQLite independentes com Supabase mockado.
- `tests/main/sync/realtime`: canal Realtime, debounce, reconexão e proteção contra payload direto.
- `tests/integration/realtime`: Realtime como gatilho de pull, lifecycle de autenticação e polling como fallback com Supabase mockado.
- `tests/preload`: API exposta pelo `contextBridge`.
- `tests/renderer`: listagem, filtros, cadastro, edição, detalhes, hooks, formatadores e client.
- `tests/renderer/DiagnosticsPage.test.tsx`: tela de diagnóstico, exportação e sincronização manual.
- `tests/smoke`: arquivos essenciais e scripts de validação/empacotamento.

## Banco nos Testes

Os testes usam banco em memória ou arquivo temporário em diretório do sistema. O banco de desenvolvimento e o banco de produção em `app.getPath('userData')` não são usados pelos testes.

Fixtures reutilizáveis ficam em `tests/fixtures/customer-fixtures.ts` e usam CPF/CNPJ fictícios.

## Testes Multi-Instância

Os cenários em `tests/integration/sync` cobrem duas instalações lógicas do aplicativo:

- criação em A e recebimento em B;
- atualização em B e recebimento em A;
- ativação e inativação;
- offline, reinício e recuperação da outbox;
- conflitos e as duas formas de resolução;
- cursor composto com mesmo `updated_at`;
- falhas de push/pull;
- isolamento entre usuários.

Esses testes usam Supabase mockado e funcionam sem internet. Consulte `MULTI_INSTANCE_TESTING.md` e `SYNC_VALIDATION_REPORT.md`.

Testes reais contra Supabase devem ser opcionais e protegidos por `RUN_SUPABASE_INTEGRATION_TESTS=true`, além de variáveis `SUPABASE_TEST_*`. Nunca use produção.

## Testes Realtime

Os testes Realtime padrão usam mocks e validam que:

- eventos Broadcast solicitam o mesmo ciclo incremental usado por polling/manual;
- vários eventos são consolidados por debounce;
- payloads Realtime não são aplicados diretamente no SQLite;
- falhas de canal não desativam polling;
- logout, troca de usuário e refresh removem ou atualizam o canal correto.

Testes reais devem ser protegidos por `RUN_SUPABASE_REALTIME_TESTS=true` e usar ambiente Supabase exclusivo de teste.

## Testes Manuais Recomendados

1. Abrir o app com `npm run dev`.
2. Cadastrar pessoa física e pessoa jurídica.
3. Validar campos obrigatórios e CPF/CNPJ duplicado.
4. Pesquisar por nome, CPF/CNPJ, e-mail e telefone.
5. Alternar filtros Ativos, Inativos e Todos.
6. Abrir detalhes, editar, inativar e reativar.
7. Reiniciar o app e confirmar persistência.
8. Acessar uma URL de cliente inexistente e confirmar mensagem amigável.
9. Abrir o histórico do cliente e confirmar que só nomes de campos alterados aparecem.
10. Abrir `/settings/diagnostics`, exportar diagnóstico e confirmar ausência de credenciais e dados pessoais.
