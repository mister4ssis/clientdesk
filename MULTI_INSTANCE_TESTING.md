# Testes Multi-Instância

## Objetivo

Validar que duas instalações do ClientDesk, autenticadas com a mesma conta, convergem para o mesmo estado usando bancos SQLite independentes e o mesmo Supabase.

## Automação Padrão

Os testes padrão ficam em `tests/integration/sync/` e não exigem internet. Eles simulam:

- Instalação A com um SQLite próprio;
- Instalação B com outro SQLite próprio;
- Supabase mockado com RLS simplificado por `userId`;
- RPC `sync_upsert_customer` com controle otimista por `version`;
- pull incremental por `updated_at` e `id`.

Execute:

```bash
npm test
```

Evite `npx vitest` direto após rebuild para Electron. Se precisar rodar um arquivo isolado:

```bash
npm rebuild better-sqlite3
npx vitest run tests/integration/sync
```

## Cenários Automatizados

- A cria cliente e B recebe.
- B atualiza cliente e A recebe.
- A inativa e B recebe.
- B reativa e A recebe.
- Cadastro offline é preservado após reinício e enviado depois.
- Pull remoto não cria outbox local.
- Registros não são duplicados.
- Conflito é detectado.
- Resolver mantendo local atualiza o remoto com versão esperada.
- Resolver usando remoto aplica snapshot sem nova outbox.
- Resolução obsoleta é rejeitada quando o remoto mudou novamente.
- Cursor composto não perde registros com mesmo `updated_at`.
- Falha de pull não avança cursor.
- Falha de push mantém outbox e respeita backoff.
- Usuários diferentes continuam isolados.

## Testes Reais Opcionais

Testes contra Supabase real devem ser executados apenas em ambiente de teste:

```bash
RUN_SUPABASE_INTEGRATION_TESTS=true
SUPABASE_TEST_URL=...
SUPABASE_TEST_PUBLISHABLE_KEY=...
SUPABASE_TEST_EMAIL=...
SUPABASE_TEST_PASSWORD=...
```

Não use o projeto de produção. Não imprima senhas, tokens, chaves ou dados pessoais.

## Perfis Locais

Para teste manual, use dois `userData` isolados. Se for necessário criar suporte de desenvolvimento para perfis, limite a uma variável exclusiva de desenvolvimento, como `CLIENTDESK_TEST_PROFILE=A|B`, sem efeito no pacote de produção.

## Limpeza

- Remova bancos temporários criados em diretórios de teste.
- Não versione `.env`, `supabase/.temp`, bancos SQLite, logs ou artefatos `release/`.
- Se usar Supabase real, limpe apenas dados de teste do usuário de teste.
