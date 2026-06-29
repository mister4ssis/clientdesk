# Known Issues - ClientDesk 0.9.0-rc.1

## Classificação

- `BLOCKER`: impede instalação/abertura, causa perda de dados, vazamento de credenciais, acesso cruzado, corrupção ou update destrutivo.
- `CRITICAL`: funcionalidade principal indisponível, sync perde alterações, backup não restaura, conflito sobrescreve dados ou autenticação insegura.
- `MAJOR`: funcionalidade importante com alternativa temporária ou validação operacional pendente.
- `MINOR`: problema visual/texto sem impacto operacional importante.

## Issues

| ID | Severidade | Descrição | Impacto | Solução temporária | Previsão | Bloqueia release |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | MAJOR | `npm run package:win` não é validável em macOS arm64 porque `better-sqlite3` não suporta cross-compile nativo para Windows x64 via node-gyp | Instalação Windows depende de CI ou máquina Windows | Executar workflow `release-candidate` em `windows-latest` | Antes da aprovação da RC | Não para commit; sim para aprovação da homologação |
| RC-002 | MAJOR | Assinatura Windows depende de certificado real nos secrets da CI | Instalador pode exibir aviso de editor desconhecido | Usar apenas com homologadores orientados; configurar `WINDOWS_CSC_LINK` e `WINDOWS_CSC_KEY_PASSWORD` | Antes de distribuição pública | Não para RC; sim para produção pública |
| RC-003 | MAJOR | Auto update real depende de prerelease publicada e ambiente de homologação | Fluxo de atualização não pode ser validado somente localmente | Publicar `v0.9.0-rc.1` como prerelease após aprovação explícita da tag | Durante homologação | Não para commit; sim para GO 1.0 |

## Política

A versão 1.0.0 não pode ser aprovada com issues `BLOCKER` ou `CRITICAL` abertas.
