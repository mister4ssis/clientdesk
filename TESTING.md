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
- `tests/preload`: API exposta pelo `contextBridge`.
- `tests/renderer`: listagem, filtros, cadastro, edição, detalhes, hooks, formatadores e client.
- `tests/smoke`: arquivos essenciais e scripts de validação/empacotamento.

## Banco nos Testes

Os testes usam banco em memória ou arquivo temporário em diretório do sistema. O banco de desenvolvimento e o banco de produção em `app.getPath('userData')` não são usados pelos testes.

Fixtures reutilizáveis ficam em `tests/fixtures/customer-fixtures.ts` e usam CPF/CNPJ fictícios.

## Testes Manuais Recomendados

1. Abrir o app com `npm run dev`.
2. Cadastrar pessoa física e pessoa jurídica.
3. Validar campos obrigatórios e CPF/CNPJ duplicado.
4. Pesquisar por nome, CPF/CNPJ, e-mail e telefone.
5. Alternar filtros Ativos, Inativos e Todos.
6. Abrir detalhes, editar, inativar e reativar.
7. Reiniciar o app e confirmar persistência.
8. Acessar uma URL de cliente inexistente e confirmar mensagem amigável.
