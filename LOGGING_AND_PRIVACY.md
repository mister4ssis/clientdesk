# Logging e Privacidade

Logs e diagnósticos do ClientDesk devem ser sanitizados por padrão.

## Permitido

- `event`;
- `code`;
- `timestamp`;
- `durationMs`;
- contadores;
- `syncRunId`;
- status;
- motivo da sincronização;
- identificador de instalação abreviado.

## Proibido

- nome do cliente;
- CPF/CNPJ;
- e-mail completo;
- telefone;
- representante;
- endereço;
- observações;
- payload Realtime;
- snapshots de conflito;
- SQL completo;
- caminhos internos;
- senha;
- access token;
- refresh token;
- chaves Supabase;
- sessão completa.

## Auditoria

Auditoria de clientes registra nomes dos campos alterados, nunca os valores. Exemplo permitido:

```json
["legalName", "representative", "phone"]
```

## Diagnóstico

Pacotes exportados são arquivos sanitizados. Eles não devem incluir banco SQLite, sessão segura, backups, logs brutos, clientes ou conflitos completos.
