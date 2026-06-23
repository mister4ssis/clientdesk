# Empacotamento - ClientDesk

## Visão Geral

O ClientDesk usa `electron-builder` para empacotar os arquivos gerados pelo `electron-vite`.

- Main compilado: `out/main/index.js`
- Preload compilado: `out/preload/index.js`
- Renderer compilado: `out/renderer`
- Migrations: `src/main/database/migrations`, copiadas para `resources/migrations` do app empacotado

O `appId` é `com.clientdesk.app` e deve permanecer estável entre versões para preservar identidade do aplicativo, atalhos e comportamento do instalador.

## Scripts

```bash
npm run build
npm run package:dir
npm run package:win
npm run verify:package
```

`package:dir` gera uma versão descompactada para testes locais. `package:win` prepara o instalador Windows NSIS x64.

## electron-builder

A configuração fica em `electron-builder.yml`:

- `asar: true` para empacotar a aplicação.
- `asarUnpack` para `node_modules/better-sqlite3/**`, pois o módulo nativo precisa ficar fora do ASAR.
- `extraResources` copia as migrations SQL para `process.resourcesPath/migrations`.
- NSIS usa instalação assistida e mantém `deleteAppDataOnUninstall: false`.

O ícone definitivo ainda está pendente. Quando `resources/icon.ico` e `resources/icon.png` existirem, a configuração `win.icon` pode ser ativada.

## better-sqlite3

`better-sqlite3` fica em `dependencies`, não em `devDependencies`, porque é necessário em produção. O `postinstall` executa:

```bash
electron-builder install-app-deps
```

Isso reconstrói dependências nativas para o Electron. O pacote deve conter `better_sqlite3.node` fora do ASAR.

## Banco de Dados

O banco nunca é incluído no pacote. Em execução, ele é criado em:

```text
path.join(app.getPath('userData'), 'data', 'clientdesk.sqlite')
```

Ele não deve ser salvo em `resources`, `app.asar`, diretório do executável, `release` ou pasta do instalador. A desinstalação normal não remove dados do usuário.

## Migrations

Em desenvolvimento, as migrations são lidas de `src/main/database/migrations`. Em produção, `runMigrations()` usa `process.resourcesPath/migrations`, preenchido pelo `extraResources`.

## Build Windows

Por causa do módulo nativo `better-sqlite3`, um instalador Windows gerado em macOS não deve ser considerado validado. O build final deve ser executado em Windows ou no workflow `.github/workflows/build-windows.yml`.

No macOS, `npm run package:win` pode falhar com:

```text
node-gyp does not support cross-compiling native modules from source
```

Isso é esperado para `better-sqlite3` ao mirar Windows x64 a partir de outro sistema operacional.

O workflow manual executa:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run package:win
npm run verify:package
```

O instalador é enviado como artifact do workflow, sem publicar release automaticamente.

## Assinatura Digital

O instalador inicial não está assinado. O Windows pode exibir aviso de editor desconhecido. Antes de distribuição pública, avaliar certificado de assinatura de código. Nenhum certificado, senha ou credencial deve ser commitado.

## Solução de Problemas

- `NODE_MODULE_VERSION` incompatível: execute `npm run rebuild:electron` para Electron ou `npm rebuild better-sqlite3` antes de testes Node.
- `cannot find module better-sqlite3`: confirme que `better-sqlite3` está em `dependencies` e que `asarUnpack` inclui o módulo.
- Migration ausente no pacote: execute `npm run verify:package` e confirme `extraResources`.
- Ícone ausente: adicione `resources/icon.ico` e `resources/icon.png`; não use arquivos protegidos por direitos autorais.
