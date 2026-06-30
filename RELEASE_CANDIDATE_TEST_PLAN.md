# Release Candidate Test Plan - ClientDesk 0.9.0-rc.1

## Objetivo

Validar a primeira Release Candidate de homologação do ClientDesk antes da versão 1.0.0. Esta RC não é produção e deve ser instalada como um usuário final usaria o aplicativo.

## Versão

- Versão: `0.9.0-rc.1`
- Tag esperada após aprovação: `v0.9.0-rc.1`
- Canal de atualização para homologação: `beta`
- Canal stable: não deve receber esta versão.

## Matriz de Ambientes

| Ambiente | Pré-condições | Responsável | Status | Evidência |
| --- | --- | --- | --- | --- |
| Windows 11 limpo | Sem Node.js, Git, banco local ou sessão anterior | QA | PENDING | Anexar print do instalador e diagnóstico |
| Windows 10 limpo | Sem Node.js, Git, banco local ou sessão anterior | QA | PENDING | Anexar print de abertura e versão |
| Atualização de versão anterior | Build anterior instalado com banco, sessão, outbox e backup | QA | PENDING | Anexar relatório de atualização |
| Offline com usuário conhecido | Login online feito previamente; internet desligada no teste | QA | PENDING | Anexar diagnóstico offline |
| Duas instalações | Dois `userData` independentes e mesma conta Supabase de teste | QA | PENDING | Anexar relatório de convergência |
| Homologação de updater | Versão anterior instalada e `0.9.0-rc.1` publicada como prerelease | QA/Release | PENDING | Anexar progresso e versão final |

## Instalação Limpa

| Cenário | Resultado Esperado | Status | Evidência |
| --- | --- | --- | --- |
| Instalador abre | NSIS exibe ClientDesk e versão correta | PENDING |  |
| Diretório de instalação customizado | Instalação conclui no diretório escolhido | PENDING |  |
| Atalhos | Atalho de desktop e menu iniciar criados | PENDING |  |
| Primeira abertura | App abre sem terminal e sem bundle JS como texto | PENDING |  |
| Segurança Electron | `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true` preservados | PENDING |  |
| Banco novo | SQLite criado em `userData/users/<user-id>` após login | PENDING |  |
| Migrations | Migrations locais executam uma vez | PENDING |  |
| Login | Tela de login aparece e autentica usuário de teste | PENDING |  |
| Sincronização | Sync inicia ou informa estado seguro/offline | PENDING |  |
| Reabertura | Dados e sessão compatível são preservados | PENDING |  |

## Funcional

| Cenário | Resultado Esperado | Status | Evidência |
| --- | --- | --- | --- |
| Cadastro pessoa física | Cliente salvo localmente e representante persistido | PENDING |  |
| Cadastro pessoa jurídica | Cliente salvo localmente e representante persistido | PENDING |  |
| Pesquisa por representante | Cliente localizado pelo representante | PENDING |  |
| Edição | Dados atualizados sem perder histórico | PENDING |  |
| Ativação/inativação | Status muda e sincroniza sem DELETE físico | PENDING |  |
| Histórico | Exibe ações e nomes de campos, sem valores pessoais | PENDING |  |
| Diagnóstico | Exibe estados e contadores sanitizados | PENDING |  |
| Backup válido | Backup criado e restaurado com sucesso | PENDING |  |
| Backup inválido | Arquivo inválido rejeitado com mensagem amigável | PENDING |  |
| Sincronização manual | Ciclo executa sem duplicar clientes | PENDING |  |
| Conflito | Conflito detectado e resolvido pelas duas opções | PENDING |  |
| Exportação de diagnóstico | JSON sem clientes, tokens, chaves ou paths internos | PENDING |  |

## Offline

| Etapa | Resultado Esperado | Status | Evidência |
| --- | --- | --- | --- |
| Login online prévio | Perfil local seguro criado | PENDING |  |
| Abrir offline | Estado `OFFLINE_AUTHENTICATED` permitido | PENDING |  |
| Criar/editar/inativar | Operações locais funcionam e entram na outbox | PENDING |  |
| Reiniciar offline | Dados locais persistem | PENDING |  |
| Restaurar conexão | Outbox sincroniza sem duplicação | PENDING |  |

## Atualização

| Cenário | Resultado Esperado | Status | Evidência |
| --- | --- | --- | --- |
| Atualização de versão anterior | Banco, sessão, outbox, conflitos e histórico preservados | PENDING |  |
| Auto update beta | `0.9.0-rc.1` aparece apenas no canal beta | PENDING |  |
| Operação crítica | Instalação bloqueada durante backup/sync/conflito/migration | PENDING |  |
| Pós-update | Versão e diagnóstico mostram `0.9.0-rc.1` | PENDING |  |

## Segurança

| Checagem | Resultado Esperado | Status | Evidência |
| --- | --- | --- | --- |
| Pacote sem `.env` | Ausente | PENDING |  |
| Pacote sem SQLite/sessões/backups/logs | Ausente | PENDING |  |
| Pacote sem `service_role`, tokens ou chaves | Ausente | PENDING |  |
| RLS | Usuário A não acessa dados de B | PENDING |  |
| Realtime | Canal isolado por usuário | PENDING |  |
| Logs | Sem CPF/CNPJ, senha, token ou dados pessoais | PENDING |  |

## Evidências Locais de 2026-06-29

| Checagem | Resultado | Evidência |
| --- | --- | --- |
| Suíte automatizada | PASS | `npm test`: 63 arquivos / 310 testes; `npm run test:integration`: 9 arquivos / 19 testes |
| Build local | PASS | `npm run build` gerou `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html` e assets |
| Pacote descompactado local | PASS | `npm run package:dir` gerou pacote macOS arm64 |
| Verificação de pacote | PASS | `npm run verify:package` e `npm run test:package` aprovaram |
| Arquivos sensíveis no pacote local | PASS_LOCAL | Busca local não encontrou `.env`, SQLite, WAL/SHM, logs, backups, PFX/PEM/KEY, tokens ou `SUPABASE_SERVICE_ROLE_KEY` |
| Instalador Windows | PENDING | Requer `windows-latest` ou máquina Windows por causa de `better-sqlite3` |
| Testes manuais de instalação e uso | PENDING | Requer Windows limpo e ambiente Supabase de teste |
| Gate final de release | PENDENTE | Sem BLOCKER/CRITICAL, mas testes manuais obrigatórios e Windows/assinatura/updater continuam sem evidência |

## Critério de Aprovação

A RC não pode avançar para produção com issue `BLOCKER` ou `CRITICAL` aberta.

## Passos Exatos Pendentes Para Fechar o Gate

1. Executar `.github/workflows/release-candidate.yml` em `windows-latest`.
2. Gerar o instalador Windows da `0.9.0-rc.1`.
3. Verificar artifacts Windows sem `.env`, bancos, logs, backups, certificados ou credenciais.
4. Instalar em Windows 11 limpo sem Node.js/Git.
5. Confirmar abertura do app, renderer, preload, migrations e login.
6. Executar cadastro, edição, ativação, inativação, histórico, diagnóstico, backup e restauração.
7. Validar atualização de versão anterior preservando banco, sessão compatível, outbox, conflitos e histórico.
8. Validar sincronização online/offline e conflitos em ambiente Supabase de teste.
9. Validar RLS e isolamento entre usuários em ambiente Supabase de teste.
10. Validar assinatura Windows real ou registrar aceitação explícita de pendência.
11. Publicar prerelease beta somente com autorização explícita e validar auto update.
