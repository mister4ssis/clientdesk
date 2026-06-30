# Auditoria de Clientes

O ClientDesk registra alterações relevantes em `customer_audit_log`, no SQLite do usuário autenticado.

## Modelo

A auditoria grava:

- cliente afetado;
- operação;
- origem;
- nomes dos campos alterados;
- usuário local dono do banco;
- instalação abreviável;
- versões técnicas opcionais;
- data da ocorrência.

Não grava valores antigos ou novos. Campos como nome, CPF/CNPJ, e-mail, telefone, endereço, observações e representante não entram como conteúdo, apenas como nomes de campos em `changed_fields`.

## Origens

- `LOCAL_USER`: cadastro, edição, ativação e inativação feitos neste computador.
- `REMOTE_SYNC`: alterações aplicadas pelo pull incremental.
- `CONFLICT_RESOLUTION`: resolução manual de conflito.
- `SYSTEM`: reservado para rotinas internas.

## Transações

Operações locais registram auditoria na mesma transação que altera `customers` e `sync_outbox`. Se a auditoria falhar, a alteração local é revertida.

Logs técnicos de sincronização são observacionais e não podem reverter alterações de clientes.

## Interface

A página de detalhes do cliente exibe a seção `Histórico` com ação, origem, campos alterados, data e instalação abreviada. A lista é paginada e não mostra JSON bruto nem identificadores completos.
