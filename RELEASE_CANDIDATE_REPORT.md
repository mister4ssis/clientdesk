# Release Candidate Report - ClientDesk

## Identificação

- Versão: `0.9.0-rc.1`
- Data da preparação: 2026-06-28
- Data da homologação técnica local: 2026-06-29
- Branch: `release/0.9.0-rc.1`
- Commit de preparação: `96d7f44 chore: prepare 0.9.0 release candidate`
- Commit de homologação: pendente até conclusão do commit
- Tag: não criada
- Ambiente local: macOS arm64 (`Darwin arm64`)
- Status do gate final: `PENDENTE` para 1.0.0 até validação em Windows limpo, CI Windows, assinatura e updater real

## Diagnóstico Inicial

- Código-base estava limpo no início da homologação técnica.
- A versão já estava configurada como `0.9.0-rc.1`.
- `package.json.main` aponta para `out/main/index.js`.
- `electron-builder.yml` preserva `deleteAppDataOnUninstall: false`, usa NSIS para Windows x64, inclui migrations como `extraResources` e desempacota `better-sqlite3`.
- As migrations SQLite existentes são `001` a `005`.
- As migrations Supabase existentes cobrem `customers`, sincronização bidirecional, Auth/RLS, constraints finais e Realtime Broadcast.
- O build Windows não é validável neste ambiente macOS arm64 por causa do módulo nativo `better-sqlite3`.

## Falha Reproduzida e Correção

| ID | Severidade | Etapa | Sintoma | Causa | Correção | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RC-004 | MAJOR | `npm test` após `npm ci` | `Electron failed to install correctly` em `tests/main/ipc/customer-ipc.test.ts` | múltiplos workers do Vitest importavam `electron` enquanto o binário ainda podia ser instalado/baixado em `node_modules/electron/dist` | adicionado `npm run ensure:electron` antes de `vitest` nos scripts `test` e `test:integration`; smoke test passou a exigir o script | RESOLVED |

## Comandos Executados

| Comando | Resultado | Duração aproximada | Observação |
| --- | --- | ---: | --- |
| `npm ci` | PASS | 34s | Instalou dependências e reconstruiu `better-sqlite3` para Electron arm64 |
| `npm run lint` | PASS | 1.5s | Antes da correção |
| `npm run typecheck` | PASS | 2.3s | Antes da correção |
| `npm test` | FAIL | 20s | Falha RC-004 reproduzida |
| `npm test` | PASS | 33s | Após correção; 63 arquivos / 310 testes |
| `npm run test:integration` | PASS | 28s | 9 arquivos / 19 testes |
| `npm run build` | PASS | 3s | Gerou `out/main`, `out/preload` e `out/renderer` |
| `npm run package:dir` | PASS | 6s | Gerou pacote local macOS arm64 |
| `npm run verify:package` | PASS | <1s | Verificação de pacote aprovada |
| `npm run test:package` | PASS | <1s | Mesmo verificador de pacote aprovado |
| `npm run release:check -- v0.9.0-rc.1` | PASS | <1s | Tag corresponde à versão do `package.json` |
| `npm run lint` | PASS | 1.6s | Após correção |
| `npm run typecheck` | PASS | 2.3s | Após correção |

## Testes Automatizados

- Unitários e renderer: PASS.
- IPC e sanitização de erros: PASS.
- Auditoria e diagnóstico: PASS.
- Atualização automática com mocks: PASS.
- Integração de sincronização bidirecional com Supabase mockado: PASS.
- Integração Realtime com mocks: PASS.
- Smoke de scripts e carregamento do renderer: PASS.

## Verificação do Pacote Local

Confirmado no pacote local macOS arm64:

- `out/main/index.js`: presente no `app.asar`.
- `out/preload/index.js`: presente no `app.asar`.
- `out/renderer/index.html`: presente no `app.asar`.
- assets do renderer: gerados em `out/renderer/assets`.
- migrations locais: presentes em `Contents/Resources/migrations`.
- `better_sqlite3.node`: presente em `app.asar.unpacked`.

Ausentes na inspeção local do diretório `release`:

- `.env`;
- bancos SQLite, WAL ou SHM;
- logs;
- backups;
- diagnósticos exportados;
- PFX/PEM/KEY;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `access_token`;
- `refresh_token`;
- variáveis main de Supabase;
- secrets de assinatura.

## Testes Manuais

Não executados neste ambiente:

- instalação Windows 11 limpa;
- instalação Windows 10, se suportado;
- instalação sem Node.js/Git;
- atualização de versão anterior;
- auto update beta real;
- assinatura Windows;
- login real Supabase;
- RLS real entre dois usuários;
- duas instalações reais com mesma conta;
- offline real com sessão previamente autenticada;
- backup/restauração manual em máquina limpa;
- desinstalação/reinstalação.

Esses cenários permanecem em `RELEASE_CANDIDATE_TEST_PLAN.md`.

## Problemas Abertos

| ID | Severidade | Descrição | Status |
| --- | --- | --- | --- |
| RC-001 | MAJOR | `npm run package:win` precisa ser validado em Windows/CI por causa de `better-sqlite3` | OPEN |
| RC-002 | MAJOR | Assinatura Windows depende de certificado real nos secrets da CI | OPEN |
| RC-003 | MAJOR | Auto update real depende de prerelease publicada e ambiente de homologação | OPEN |

Não há `BLOCKER` ou `CRITICAL` aberto na validação automatizada local.

## Riscos

- O instalador Windows ainda não foi gerado nem instalado neste ciclo local.
- Sem assinatura real, homologadores podem ver aviso de editor desconhecido no Windows.
- O updater real não foi exercitado porque nenhuma tag/prerelease foi criada.
- Testes Supabase reais não foram executados; apenas mocks foram validados.
- A recomendação de produção depende de evidências em Windows limpo e ambiente Supabase de teste.

## Recomendação

`PENDENTE` para 1.0.0.

Próxima etapa recomendada: executar o workflow `release-candidate` em `windows-latest`, validar o instalador em máquina Windows limpa e, se as pendências forem resolvidas sem BLOCKER/CRITICAL, manter `0.9.0-rc.1` como candidata de homologação. Se surgir falha impeditiva, preparar `0.9.0-rc.2`.

## Gate Final de Release - 2026-06-29

Decisão: `PENDENTE`.

Resumo:

- BLOCKER abertos: 0.
- CRITICAL abertos: 0.
- MAJOR abertos: 3 (`RC-001`, `RC-002`, `RC-003`).
- MINOR abertos: 0.
- Testes automatizados locais: PASS.
- Testes manuais obrigatórios com evidência: PENDING.
- Instalação limpa Windows: PENDING.
- Atualização de versão anterior: PENDING.
- Migrations em pacote local: PASS_LOCAL.
- Assinatura: PENDING.
- Sincronização com mocks: PASS.
- Sincronização real/Supabase Auth/RLS em ambiente de teste: PENDING.
- Backup e restauração manual: PENDING.
- Segurança de pacote local: PASS_LOCAL.

Comandos executados no gate:

| Comando | Resultado | Duração aproximada |
| --- | --- | ---: |
| `git status --short` | PASS, limpo | <1s |
| `git branch --show-current` | PASS, `release/0.9.0-rc.1` | <1s |
| `git log -10 --oneline` | PASS | <1s |
| `git tag --list --sort=-version:refname \| head -20` | PASS, sem tags listadas | <1s |
| `npm ci` | PASS | 33s |
| `npm run lint` | PASS | 2s |
| `npm run typecheck` | PASS | 2s |
| `npm test` | PASS, 63 arquivos / 310 testes | 34s |
| `npm run test:integration` | PASS, 9 arquivos / 19 testes | 30s |
| `npm run build` | PASS | 3s |
| `npm run package:dir` | PASS, pacote macOS arm64 local | 6s |
| `npm run verify:package` | PASS | <1s |
| `npm run release:check -- v0.9.0-rc.1` | PASS | <1s |
| `npm run release:check` | PASS, versão SemVer validada sem tag | <1s |

`npm run package:win` não foi executado porque o gate rodou em `Darwin arm64`. O instalador Windows deve ser validado no workflow `release-candidate` em `windows-latest`.

Decisão sobre versão:

- `1.0.0` não foi preparada.
- `0.9.0-rc.2` não foi preparada porque não há BLOCKER/CRITICAL nem correção funcional pendente que justifique nova RC.
- A versão permanece `0.9.0-rc.1`.
