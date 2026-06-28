# Diagnóstico

O diagnóstico do ClientDesk é local, sanitizado e criado apenas por ação do usuário.

## Tela

A rota `/settings/diagnostics` mostra:

- versão do app;
- plataforma e arquitetura;
- versão do Electron e Node;
- versão do schema SQLite;
- usuário mascarado;
- estado de autenticação;
- estado de sincronização e Realtime;
- contadores de outbox e conflitos;
- cursor incremental de clientes;
- últimos ciclos de sincronização;
- último código de erro;
- resultado de `PRAGMA integrity_check`.

Não exibe caminho do banco, Supabase URL, chaves, tokens, sessão, conteúdo de outbox, snapshots de conflito ou dados dos clientes.

## Exportação

A exportação usa diálogo nativo no processo main e gera JSON sanitizado com nome `ClientDesk-diagnostics-YYYYMMDD-HHmmss.json`.

O arquivo pode conter contadores, estados, versões, migrations aplicadas e logs técnicos agregados. Não contém banco SQLite, backups, sessão, chaves, tokens, clientes, histórico de clientes ou dados pessoais.

## Retenção

Configurações:

- `MAIN_VITE_AUDIT_RETENTION_DAYS=365`
- `MAIN_VITE_SYNC_LOG_RETENTION_DAYS=30`
- `MAIN_VITE_SYNC_LOG_MAX_ROWS=1000`

A retenção remove logs técnicos antigos e auditoria acima do prazo configurado. Conflitos pendentes não são removidos.
