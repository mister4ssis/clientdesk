# Relatório de Validação da Sincronização

## Escopo

Validação automatizada da sincronização bidirecional entre duas instalações lógicas do ClientDesk. A suíte padrão usa Supabase mockado e bancos SQLite independentes.

## Cenários Executados

- A cria cliente com representante e B recebe.
- B altera nome, representante e telefone; A recebe.
- A inativa e B recebe.
- B reativa e A recebe.
- A cria cliente offline, reinicia e sincroniza depois.
- Pull remoto aplica registros sem gerar outbox.
- Mesmo cliente não é duplicado.
- Conflito local/remoto é registrado sem sobrescrever dados.
- Resolução "manter local" atualiza o remoto com controle otimista.
- Resolução "usar remoto" aplica snapshot e remove pendência local.
- Versão remota mais nova impede resolução obsoleta.
- Cursor composto processa registros com o mesmo `updated_at`.
- Falha durante pull não avança cursor.
- Falha durante push mantém outbox e permite recuperação.
- Execuções simultâneas de sincronização são bloqueadas.
- Usuários diferentes não enxergam registros um do outro no mock.

## Correções Aplicadas

- Criada infraestrutura de testes em `tests/integration/sync/` para duas instalações SQLite independentes e Supabase mockado.
- Adicionados logs sanitizados ao `BackgroundSyncService` com `syncRunId`, fase, contadores, duração e código de erro.
- Atualizada validação documental do processo multi-instância.

## Resultado

`npm test` passou com 47 arquivos e 262 testes.

## Riscos Restantes

- A validação remota real depende de projeto Supabase de teste e credenciais de usuário de teste.
- A suíte mockada valida contrato e fluxo, mas não substitui teste manual/CI contra RLS real.
- Não há E2E automatizado controlando duas janelas Electron reais.
- Não há Realtime ou Broadcast; convergência depende de ciclos manuais, imediatos ou periódicos.

## Recomendações

- Criar ambiente Supabase dedicado para testes de integração reais.
- Adicionar workflow manual protegido por `RUN_SUPABASE_INTEGRATION_TESTS=true`.
- Executar teste manual com duas instalações empacotadas antes de release pública.
