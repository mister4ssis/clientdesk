# Autenticação

## Arquitetura

O renderer usa apenas `window.clientDesk.auth`, exposto pelo preload. O processo main mantém o cliente Supabase, a sessão e o armazenamento seguro.

```text
Renderer -> auth-client -> preload -> IPC auth:* -> AuthService -> Supabase Auth
```

Tokens nunca são enviados ao renderer.

## Login

O login usa e-mail e senha via Supabase Auth. O e-mail é normalizado com `trim` e `lowercase`; a senha existe apenas durante a chamada IPC.

Mensagens públicas não diferenciam usuário inexistente de senha incorreta.

## Sessão

O cliente Supabase é criado com:

- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: false`
- storage seguro próprio no processo main

`AuthState` público contém apenas status, usuário seguro e flags de uso local/sync.

Em diagnósticos exportáveis, o e-mail é mascarado e tokens nunca são incluídos.

## Armazenamento Seguro

`SecureSessionStorage` grava `app.getPath('userData')/auth/session.enc` usando `safeStorage`. A gravação é atômica com arquivo temporário e `rename`.

Se `safeStorage` não estiver disponível, a sessão fica somente em memória. O app pode operar na sessão atual, mas não persiste login para reinício.

## Estados

- `INITIALIZING`
- `AUTHENTICATED`
- `OFFLINE_AUTHENTICATED`
- `UNAUTHENTICATED`
- `SESSION_EXPIRED`
- `ERROR`

Em `OFFLINE_AUTHENTICATED`, o usuário pode usar dados locais e gerar outbox, mas a sincronização remota fica pausada.

## Logout

Logout para o scheduler, fecha o banco atual, limpa sessão/perfil locais e volta para login. O banco local, backups e dados remotos não são apagados.

## Realtime

Quando o estado fica `AUTHENTICATED`, o processo main pode criar o canal Realtime privado do usuário para receber gatilhos de pull. Após `TOKEN_REFRESHED`, o token do Realtime é atualizado somente em memória no processo main.

Em `SIGNED_OUT`, troca de usuário ou `SESSION_EXPIRED`, o canal é removido e a sincronização remota fica pausada. Tokens nunca são enviados ao renderer.

## Limitações

- Sem cadastro público.
- Sem recuperação de senha.
- Sem MFA, OAuth ou login social.
- Modo offline protege principalmente no contexto do usuário do sistema operacional.
