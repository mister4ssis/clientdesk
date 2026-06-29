# Go-Live Checklist - ClientDesk 1.0.0

## Release Candidate

- [ ] `0.9.0-rc.1` instalada em Windows 11 limpo
- [ ] `0.9.0-rc.1` validada em Windows 10, se suportado
- [ ] Instalador validado
- [ ] Assinatura validada
- [ ] Atualização validada
- [ ] Instalação limpa validada
- [ ] Atualização de versão anterior validada
- [ ] Migrações validadas
- [ ] Persistência validada
- [ ] Offline validado
- [ ] Sincronização validada
- [ ] Conflitos validados
- [ ] RLS validado
- [ ] Realtime validado
- [ ] Polling fallback validado
- [ ] Backup validado
- [ ] Restauração validada
- [ ] Diagnóstico validado
- [ ] Exportação de diagnóstico sanitizada
- [ ] Logs revisados
- [ ] Documentação revisada
- [ ] Problemas críticos zerados
- [ ] Rollback documentado

## Segurança

- [ ] `.env` ausente do pacote
- [ ] Chaves Supabase ausentes do renderer
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausente do pacote
- [ ] Access/refresh tokens ausentes do renderer e logs
- [ ] Bancos SQLite ausentes do pacote
- [ ] Sessões ausentes do pacote
- [ ] Backups ausentes do pacote
- [ ] Certificados e PFX ausentes do repositório
- [ ] `nodeIntegration=false`
- [ ] `contextIsolation=true`
- [ ] `sandbox=true`

## Atualização

- [ ] Canal stable não recebe prerelease
- [ ] Canal beta recebe RC quando habilitado
- [ ] Downgrade automático bloqueado
- [ ] Instalação exige confirmação do usuário
- [ ] Instalação bloqueada durante operação crítica
- [ ] Banco preservado após update
- [ ] Outbox preservada após update
- [ ] Sessão compatível preservada após update
- [ ] Migrations executadas uma vez

## Decisão

- [ ] GO aprovado
- [ ] NO-GO registrado com motivos
- [ ] Tag `v1.0.0` criada somente após aprovação
