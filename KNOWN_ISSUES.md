# Known Issues - ClientDesk 0.9.0-rc.1

## Classificação

- `BLOCKER`: impede instalação/abertura, causa perda de dados, vazamento de credenciais, acesso cruzado, corrupção ou update destrutivo.
- `CRITICAL`: funcionalidade principal indisponível, sync perde alterações, backup não restaura, conflito sobrescreve dados ou autenticação insegura.
- `MAJOR`: funcionalidade importante com alternativa temporária ou validação operacional pendente.
- `MINOR`: problema visual/texto sem impacto operacional importante.

## Issues Abertas

| ID | Severidade | Descrição | Passos / Condição | Impacto | Solução temporária | Previsão | Bloqueia produção |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RC-001 | MAJOR | `npm run package:win` não é validável em macOS arm64 porque `better-sqlite3` não suporta cross-compile nativo para Windows x64 via node-gyp | Executar `npm run package:win` fora de Windows/CI Windows | Instalação Windows depende de CI ou máquina Windows | Executar workflow `release-candidate` em `windows-latest` | Antes da aprovação da RC | Sim, enquanto não houver artefato Windows validado |
| RC-002 | MAJOR | Assinatura Windows depende de certificado real nos secrets da CI | Executar pipeline sem `WINDOWS_CSC_LINK` e `WINDOWS_CSC_KEY_PASSWORD` | Instalador pode exibir aviso de editor desconhecido | Usar apenas com homologadores orientados; configurar secrets reais antes de distribuição pública | Antes de distribuição pública | Sim para produção pública |
| RC-003 | MAJOR | Auto update real depende de prerelease publicada e ambiente de homologação | Sem tag/prerelease publicada no canal beta | Fluxo de atualização não pode ser validado somente localmente | Publicar `v0.9.0-rc.1` como prerelease após aprovação explícita da tag | Durante homologação | Sim para GO 1.0 |

## Contagem do Gate Final - 2026-06-29

- BLOCKER abertos: 0.
- CRITICAL abertos: 0.
- MAJOR abertos: 3.
- MINOR abertos: 0.
- Decisão: `PENDENTE`, porque os testes manuais obrigatórios e a validação Windows/assinatura/updater ainda não possuem evidência.

## Issues Resolvidas

| ID | Severidade | Descrição | Passos de reprodução | Causa | Correção | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RC-004 | MAJOR | `npm test` podia falhar após `npm ci` com `Electron failed to install correctly` | `npm ci` seguido de `npm test` em instalação limpa local | workers paralelos do Vitest importavam `electron` antes de uma instalação serial garantida do binário | criado script `ensure:electron` e executado antes de `vitest` em `test` e `test:integration`; smoke test valida o script | RESOLVED |

## Política

A versão 1.0.0 não pode ser aprovada com issues `BLOCKER` ou `CRITICAL` abertas. Issues `MAJOR` abertas exigem decisão explícita de risco antes de produção.
