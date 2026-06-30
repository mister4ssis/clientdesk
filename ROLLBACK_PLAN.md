# Rollback Plan - ClientDesk

## Objetivo

Definir como interromper uma distribuição problemática do ClientDesk sem apagar dados locais, sessões, backups, outbox ou conflitos.

## Quando Interromper a Distribuição

Interrompa a distribuição quando houver:

- falha de instalação ou abertura em máquinas limpas;
- perda, corrupção ou mistura de dados;
- vazamento de credenciais;
- acesso cruzado entre usuários;
- sincronização perdendo alterações;
- backup/restauração indisponível;
- atualização apagando banco, sessão, outbox ou conflitos;
- migration local incompatível;
- assinatura ou artifact comprometido.

## Como Desativar a Release

1. Marcar a release problemática como draft ou prerelease indisponível no provedor.
2. Remover ou substituir os artifacts de atualização quando o provedor permitir.
3. Interromper a promoção no canal afetado.
4. Manter checksums e relatório técnico para investigação.
5. Não apagar tags ou histórico sem decisão explícita do responsável pelo release.

## Como Impedir Novas Atualizações

1. Manter `MAIN_VITE_UPDATE_ENABLED=false` em builds distribuíveis até validação.
2. Remover a versão problemática do canal de atualização.
3. Publicar comunicado orientando usuários a não instalar a versão afetada.
4. Se necessário, publicar nova RC corrigida no canal beta.
5. Não apontar usuários stable para builds `beta` ou `rc` sem escolha explícita.

## Como Restaurar a Versão Anterior

1. Orientar o usuário a fechar o ClientDesk.
2. Instalar novamente a versão anterior validada.
3. Preservar `app.getPath('userData')`.
4. Não remover bancos SQLite, backups, sessão, outbox ou conflitos.
5. Abrir o aplicativo e validar integrity check, migrations e login.

Não fazer downgrade automático de schema. Se o banco tiver sido migrado para uma versão incompatível com o app anterior, manter o banco preservado e usar uma build corrigida compatível.

## Como Preservar userData

O diretório `userData` contém bancos por usuário, sessão segura, backups automáticos e metadados locais. Ele deve ser preservado durante:

- desinstalação;
- reinstalação;
- rollback de aplicativo;
- investigação de incidente.

Não solicitar exclusão manual de `userData` como primeira solução.

## Como Restaurar Backup

1. Criar cópia externa do `userData` antes de qualquer tentativa.
2. Abrir o ClientDesk em versão validada.
3. Usar o fluxo de restauração do aplicativo.
4. Validar `PRAGMA integrity_check`.
5. Confirmar que `app_metadata.owner_user_id` corresponde ao usuário atual.
6. Executar migrations suportadas.

Backups de outro usuário devem continuar rejeitados.

## Migration Incompatível

Se uma migration local falhar ou tornar o schema incompatível:

1. Pausar sincronização remota.
2. Preservar banco, WAL/SHM, backups, outbox e conflitos.
3. Registrar código de erro sanitizado.
4. Não executar downgrade automático de schema.
5. Preparar hotfix ou nova RC com migration corretiva.
6. Validar a correção em cópia do banco antes de orientar o usuário.

## Outbox e Conflitos

Durante rollback:

- preservar `sync_outbox`;
- preservar `sync_conflicts`;
- não marcar itens pendentes como sincronizados;
- não avançar cursor manualmente;
- não descartar conflitos pendentes.

A sincronização deve retomar somente após app e schema compatíveis.

## Comunicação

A comunicação de incidente deve informar:

- versão afetada;
- severidade;
- impacto conhecido;
- ações recomendadas;
- versão segura recomendada;
- necessidade de preservar dados locais;
- como exportar diagnóstico sanitizado.

Não solicitar envio de banco SQLite, sessão, tokens, senhas ou dados pessoais por canais não seguros.
