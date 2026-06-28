# Release Process

## Versionamento

O ClientDesk usa Semantic Versioning em `package.json`.

Tags de release devem seguir:

- `vX.Y.Z`
- `vX.Y.Z-beta.N`
- `vX.Y.Z-rc.N`

Antes de publicar, a CI executa:

```bash
npm run release:check -- vX.Y.Z
```

O comando falha quando a tag não corresponde exatamente à versão de `package.json`.

## Pipeline

`build-windows.yml` roda em `windows-latest` para validação e artifacts:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run package:dir
npm run verify:package
npm run package:win
```

Esse workflow não publica releases.

`release-windows.yml` roda somente em tags `v*`, valida a versão, executa os mesmos testes, gera o instalador NSIS x64, verifica os artifacts e publica na GitHub Release da tag.

## Artifacts

Artifacts esperados:

- instalador NSIS `.exe`;
- metadados do updater `.yml`;
- `.blockmap`, quando gerado;
- checksums SHA-256;
- relatório de verificação.

Artifacts não podem conter `.env`, bancos SQLite, WAL/SHM, logs, backups, diagnósticos exportados, certificados ou credenciais.

## Publicação

A publicação usa GitHub Releases e o token efêmero da própria pipeline. Tokens de publicação não ficam no repositório nem no bundle.

Releases estáveis usam tags sem prerelease. Versões `beta` e `rc` devem ser marcadas como prerelease no GitHub quando usadas para homologação.
