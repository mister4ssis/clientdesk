# Backup e Restauração - ClientDesk

## Arquitetura

O renderer chama `backup-client.ts`, que usa `window.clientDesk.backup`. O preload encaminha chamadas para canais IPC específicos. O processo principal executa diálogos nativos, validação, backup, restauração, filesystem e SQLite.

```text
renderer -> window.clientDesk.backup -> IPC -> BackupService -> SQLite/fs
```

O renderer não recebe o caminho interno do banco e não acessa `fs`, `path`, `dialog`, SQLite ou `ipcRenderer`.

## Fluxo de Backup

1. O usuário escolhe o local pelo diálogo nativo.
2. O nome sugerido segue `ClientDesk-backup-YYYY-MM-DD-HHmm.sqlite`.
3. O `BackupService` usa `database.backup()` do `better-sqlite3`.
4. O arquivo gerado é validado antes do sucesso ser informado.
5. A UI exibe apenas o nome do arquivo, não o caminho completo.

Cancelamento do diálogo retorna sucesso operacional com `success: false`, sem alerta de erro.

## Fluxo de Restauração

1. A UI exige confirmação explícita.
2. O processo principal abre diálogo para selecionar o backup.
3. O arquivo é validado antes de alterar o banco atual.
4. Um backup automático do banco atual é criado.
5. A conexão é fechada, o arquivo é substituído e a conexão é reaberta.
6. Migrations atuais são executadas.
7. A conexão e os handlers passam a usar o banco restaurado.
8. A interface retorna para a listagem de clientes.

Se alguma etapa falhar após a substituição, o backup automático anterior é restaurado.

## Validação

Um backup só é aceito quando:

- o arquivo existe e não está vazio;
- pode ser aberto como SQLite;
- `PRAGMA integrity_check` retorna `ok`;
- `schema_migrations` existe;
- `customers` existe;
- colunas essenciais de `customers` existem;
- o arquivo não é o banco ativo;
- a versão das migrations não é futura.
- quando houver usuário autenticado, `app_metadata.owner_user_id` corresponde ao usuário atual.

## Compatibilidade de Migrations

Backups antigos podem ser restaurados e atualizados pelas migrations atuais. Backups com versão de migration maior que a suportada pelo aplicativo são rejeitados. A versão de schema suportada nesta etapa é `5`.

## Localização

Banco ativo por usuário:

```text
app.getPath('userData')/users/<user-id>/clientdesk.sqlite
```

O caminho legado `app.getPath('userData')/data/clientdesk.sqlite` não é associado automaticamente a nenhuma conta.

Backups automáticos antes de restauração:

```text
app.getPath('userData')/backups/before-restore-YYYY-MM-DD-HHmmss.sqlite
```

Não há exclusão automática de backups nesta etapa.

## Códigos de Erro

- `BACKUP_CREATE_FAILED`
- `BACKUP_RESTORE_FAILED`
- `BACKUP_INVALID_FILE`
- `BACKUP_INCOMPATIBLE_VERSION`
- `BACKUP_OPERATION_IN_PROGRESS`
- `BACKUP_CANCELLED`

Mensagens públicas não expõem SQL, stack trace, caminhos internos ou dados pessoais.

## Segurança

Não são registrados CPF/CNPJ, e-mail, telefone, observações ou conteúdo do banco. Logs técnicos devem conter apenas tipo da operação, status, data e código sanitizado.

## Testes

Há testes para validator, service, IPC, preload, client do renderer e página de configurações. Testes usam bancos e diretórios temporários, nunca o banco real do usuário.

## Limitações

- Sem criptografia de backup.
- Sem backup remoto.
- Sem agendamento automático.
- Sem política automática de exclusão de backups antigos.
