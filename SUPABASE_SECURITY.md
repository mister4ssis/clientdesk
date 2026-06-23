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

Como não há estratégia de Supabase Auth/RLS documentada neste repositório, `SYNC_ENABLED=false` permanece como padrão. A infraestrutura local e a migration remota estão prontas, mas a sincronização remota não deve ser tratada como pronta para produção até existir controle de acesso seguro.

## Renderer

O renderer não recebe URL, chaves, cliente Supabase, `fetch` genérico ou canais arbitrários. Toda sincronização passa por IPC específico e serviços no processo main.

## Logs

Logs de sincronização não devem conter CPF/CNPJ, e-mail, telefone, observações, chaves, URL com credenciais ou mensagens completas do banco remoto.
