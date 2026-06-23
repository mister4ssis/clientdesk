# Segurança Supabase

## Chaves

O aplicativo desktop pode usar somente `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` ou, por compatibilidade, `SUPABASE_ANON_KEY`.

Nunca use ou distribua:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- certificados, tokens administrativos ou credenciais privadas.

Se uma chave secreta for detectada no ambiente, o app emite apenas aviso sanitizado e ignora o valor.

## RLS e Auth

A migration remota habilita RLS, mas não cria policy pública permissiva. Não desabilite RLS e não crie policy `USING (true)` para resolver sincronização.

Como não há fluxo de autenticação de usuário final implementado no app, `SYNC_ENABLED=false` e `SYNC_PULL_ENABLED=false` permanecem como padrão. A infraestrutura local, migrations remotas, RLS por `user_id = auth.uid()` e RPC versionada estão prontas, mas a sincronização remota não deve ser tratada como pronta para produção até existir sessão autenticada segura.

O pull remoto é bloqueado por segurança quando não há sessão. Não contorne isso criando policy pública, desabilitando RLS ou usando `service_role`.

## Propriedade dos Registros

A estratégia adotada para o remoto é `customers.user_id UUID NOT NULL REFERENCES auth.users(id)`. O valor é derivado de `auth.uid()` na RPC/policies e não deve ser aceito livremente do renderer ou de payloads locais.

## Renderer

O renderer não recebe URL, chaves, cliente Supabase, `fetch` genérico ou canais arbitrários. Toda sincronização passa por IPC específico e serviços no processo main.

## Logs

Logs de sincronização não devem conter CPF/CNPJ, e-mail, telefone, observações, chaves, URL com credenciais ou mensagens completas do banco remoto.
