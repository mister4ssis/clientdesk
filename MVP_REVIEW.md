# Revisão do MVP - ClientDesk

## Resumo

Revisão realizada em 2026-06-22 sobre o MVP de cadastro de clientes. A linha de base estava estável: `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passaram antes das alterações.

## Problemas Encontrados e Soluções

| Gravidade | Problema | Arquivos afetados | Solução aplicada |
| --- | --- | --- | --- |
| Média | Não havia teste integrado cobrindo `CustomerService -> CustomerRepository -> SQLite` com arquivo temporário e reabertura da conexão. | `tests/main/customers/customer.integration.test.ts`, `tests/fixtures/customer-fixtures.ts` | Criado teste de ciclo completo: criar, consultar, listar, pesquisar, atualizar, inativar, reativar, bloquear duplicidade e validar persistência após reabrir o banco. |
| Média | Scripts de empacotamento esperados para release não estavam nomeados como `package`, `package:dir` e `package:win`. | `package.json` | Adicionados scripts mantendo `dist:win` como alias existente. |
| Baixa | Não havia documentação formal de revisão, testes e checklist de release. | `MVP_REVIEW.md`, `TESTING.md`, `RELEASE_CHECKLIST.md`, `README.md`, `PLAN.md` | Criada documentação operacional para validação e preparação do empacotamento. |
| Baixa | Busca escapava `%` e `_`, mas o SQL não declarava `ESCAPE`, tornando buscas literais por esses caracteres inconsistentes. | `src/main/modules/customers/customer.repository.ts`, `tests/main/customers/customer.repository.test.ts` | Adicionado `ESCAPE '\'` nas consultas `LIKE` textuais e teste específico. |
| Baixa | Testes IPC de erro sanitizado imprimiam logs esperados no stderr. | `tests/main/ipc/customer-ipc.test.ts` | Logs foram mockados nos cenários esperados e a chamada sanitizada passou a ser verificada. |
| Baixa | `afterEach` de testes com SQLite assumia conexão aberta mesmo se a abertura falhasse por ABI nativa. | `tests/main/customers/*.test.ts` | Fechamento da conexão ficou defensivo com verificação de estado. |

## Itens Não Corrigidos

- Testes E2E com interação real na janela Electron não foram adicionados para evitar nova dependência pesada nesta etapa.
- Assinatura digital, ícone definitivo e teste em máquina limpa continuam para a etapa de empacotamento.
- Validação matemática completa de CPF/CNPJ segue fora do MVP atual, conforme decisão já documentada.

## Riscos Conhecidos

- `better-sqlite3` é nativo e precisa ser reconstruído para o runtime correto. Use `npm test` para Vitest e `npm run rebuild:electron` antes de executar Electron.
- Migrations devem ser incluídas no pacote via `extraResources`; isso precisa ser confirmado em build empacotado.
- O MVP ainda não possui backup automático; perda do arquivo SQLite local implica perda dos dados.

## Recomendações Futuras

- Adicionar teste E2E leve com ferramenta dedicada quando o fluxo de empacotamento estiver estável.
- Validar instalador Windows em máquina limpa.
- Definir ícone, assinatura digital e política de backup antes de uso real com dados sensíveis.
- Avaliar validação matemática de CPF/CNPJ em uma etapa separada.
