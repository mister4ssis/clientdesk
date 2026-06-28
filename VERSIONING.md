# Versioning

## SemVer

O ClientDesk usa:

```text
MAJOR.MINOR.PATCH
```

Exemplos:

- `0.6.0`
- `0.6.1`
- `1.0.0`

Prereleases permitidos:

- `0.6.0-beta.1`
- `0.6.0-rc.1`

## Tags

Tags de release devem ter prefixo `v`:

```text
v0.6.0
v0.6.0-beta.1
v0.6.0-rc.1
```

`scripts/verify-release-version.mjs` valida formato e correspondência com `package.json`.

## Compatibilidade

Versões antigas não devem sincronizar dados incompatíveis com schema mais novo. Quando uma migration local mudar contrato relevante de sync, documente:

- `appVersion`;
- versão de schema local;
- versão mínima suportada do aplicativo;
- versão mínima suportada de schema.

Downgrade automático não é permitido.
