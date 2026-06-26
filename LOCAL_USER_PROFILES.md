# Perfis Locais por Usuário

## Banco por Conta

Cada usuário autenticado usa um SQLite próprio:

```text
app.getPath('userData')/users/<user-id>/clientdesk.sqlite
```

O `user-id` precisa ser UUID válido antes de compor o caminho. Caminhos vindos do renderer não são aceitos.

## Perfil Local

O perfil local contém apenas:

- `userId`
- `email`
- `lastVerifiedAt`

Ele é criptografado com `safeStorage` e não contém senha, access token ou refresh token.

## Modo Offline

Um usuário que já autenticou neste computador pode abrir o banco local em modo `OFFLINE_AUTHENTICATED` quando não houver conexão. Alterações continuam locais e entram na outbox.

Primeiro acesso offline não é permitido.

## Banco Legado

O banco antigo em `app.getPath('userData')/data/clientdesk.sqlite` não é atribuído automaticamente a nenhuma conta.

Procedimento recomendado:

1. Fazer backup manual do banco legado.
2. Autenticar o usuário correto.
3. Migrar o arquivo somente após confirmação explícita fora desta etapa.
4. Manter o arquivo legado até validação manual.

## Logout

Logout fecha o banco atual e limpa sessão/perfil. Ele não apaga o diretório `users/<user-id>` nem backups.
