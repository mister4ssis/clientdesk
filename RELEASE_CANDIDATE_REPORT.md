# Release Candidate Report - ClientDesk

## Identificação

- Versão: `0.9.0-rc.1`
- Data: 2026-06-28
- Branch: `release/0.9.0-rc.1`
- Commit de preparação: pendente até conclusão do commit
- Tag: não criada
- Ambiente local de preparação: macOS arm64
- Status preliminar: `NO-GO` para produção até validação em Windows limpo

## Diagnóstico Inicial

- Código-base estava limpo antes da preparação.
- Versão anterior configurada: `0.1.0`.
- Pipeline Windows e updater já existiam.
- Faltavam estrutura formal de homologação RC, workflow `release-candidate`, scripts `test:integration` e `test:package`, e documentos de plano/relatório/issues/go-live.
- Build Windows local em macOS arm64 não deve ser considerado validação por causa de `better-sqlite3`.

## Testes Automatizados Executados Antes das Alterações

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 63 arquivos / 310 testes |
| `npm run build` | PASS |

## Testes Automatizados Pós-Alteração

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 63 arquivos / 310 testes |
| `npm run test:integration` | PASS, 9 arquivos / 19 testes |
| `npm run build` | PASS |
| `npm run package:dir` | PASS em macOS arm64 |
| `npm run test:package` | PASS |
| `npm run verify:package` | PASS |
| `npm run release:check -- v0.9.0-rc.1` | PASS |
| `npm run package:win` | PENDING em Windows/CI; falhou localmente por cross-compile do `better-sqlite3` |

## Testes Manuais

Ainda não executados nesta máquina. Devem ser realizados conforme `RELEASE_CANDIDATE_TEST_PLAN.md`.

## Falhas e Bloqueadores

| ID | Severidade | Descrição | Status |
| --- | --- | --- | --- |
| RC-001 | MAJOR | Build Windows não validável em macOS arm64 por cross-compile de `better-sqlite3`; requer workflow ou máquina Windows | OPEN |
| RC-002 | MAJOR | Assinatura Windows depende de certificado real nos secrets da CI | OPEN |

## Riscos

- Instalador não assinado pode exibir aviso do Windows.
- Homologação real exige ambiente Supabase de teste e máquinas Windows limpas.
- Auto update só pode ser validado após prerelease publicada no canal beta.

## Inspeção Local de Pacote

- Arquivos `.env`, SQLite, WAL/SHM, logs, PFX/PEM/KEY no diretório `release`: ausentes na inspeção local.
- Strings `SUPABASE_SERVICE_ROLE_KEY`, `access_token`, `refresh_token` e variáveis Supabase main no diretório `release`: ausentes na inspeção local.
- Instalador Windows: não gerado neste ambiente; requer workflow Windows.

## Decisão Preliminar

`NO-GO` para produção. A branch prepara a RC, mas a aprovação depende da execução do workflow Windows, instalação em máquinas limpas e testes manuais do plano de homologação.
