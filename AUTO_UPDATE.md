# Auto Update

## Arquitetura

Atualizações usam `electron-updater` somente no processo main.

Renderer:

```text
window.clientDesk.update
```

Preload:

```text
update:get-state
update:check
update:download
update:install
```

O renderer não recebe `autoUpdater`, URL do provider, token, caminho do instalador ou arquivo arbitrário.

## Configuração

Padrão seguro:

```env
MAIN_VITE_UPDATE_ENABLED=false
MAIN_VITE_UPDATE_CHANNEL=beta
MAIN_VITE_UPDATE_CHECK_DELAY_SECONDS=30
```

Para a RC `0.9.0-rc.1`, o canal de homologação é `beta` e as atualizações continuam desabilitadas por padrão. Habilite atualizações somente depois de validar assinatura, GitHub Releases e teste de atualização em homologação. Builds stable devem usar canal `stable`.

## Fluxo

1. Aplicativo inicia.
2. Banco e migrations são validados.
3. Interface abre.
4. Após atraso configurado, o main verifica atualização se habilitado.
5. Usuário autoriza download.
6. Usuário confirma reinício e instalação.

`autoDownload` e `autoInstallOnAppQuit` ficam desabilitados.

## Bloqueios

Instalação é bloqueada quando houver:

- backup ou restauração em andamento;
- migration em andamento;
- sincronização em andamento;
- resolução de conflito em andamento.

Antes de instalar, o main para trabalhos de background e fecha o SQLite.

## Dados do usuário

Atualização não inclui nem substitui o banco SQLite. O banco permanece em `app.getPath('userData')`, a outbox é preservada e migrations locais são aplicadas na próxima abertura.

O aplicativo desktop não aplica migrations Supabase.
