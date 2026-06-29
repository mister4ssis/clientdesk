# Release Checklist - ClientDesk

## Preparação

- [ ] lint aprovado
- [ ] typecheck aprovado
- [ ] testes aprovados
- [ ] build aprovado
- [ ] migrations validadas
- [ ] login Supabase validado
- [ ] sessão persistida com `safeStorage`
- [ ] tokens ausentes no renderer
- [ ] banco por usuário validado
- [ ] segurança revisada
- [ ] banco salvo em `userData`
- [ ] backup criado e validado
- [ ] restauração validada com backup automático
- [ ] outbox de sincronização validada
- [ ] cursor incremental validado
- [ ] conflitos de sincronização validados
- [ ] convergência entre duas instalações validada
- [ ] cursor composto com `updated_at` igual validado
- [ ] falha de push/pull validada sem perda de dados
- [ ] `SYNC_ENABLED=false` validado para uso offline
- [ ] `SYNC_PULL_ENABLED=false` validado como padrão seguro
- [ ] persistência validada
- [ ] erros sanitizados
- [ ] logs revisados
- [ ] `npm run release:check` aprovado para tag de release
- [ ] tag `vX.Y.Z` corresponde a `package.json`
- [ ] para RC, tag `v0.9.0-rc.1` corresponde a `package.json`
- [ ] workflow `release-candidate.yml` validado como prerelease
- [ ] workflow Windows gerou artifacts sem dados locais
- [ ] updater validado com `MAIN_VITE_UPDATE_ENABLED=false` por padrão

## Testes Funcionais

- [ ] cadastro pessoa física
- [ ] cadastro pessoa jurídica
- [ ] CPF/CNPJ duplicado
- [ ] pesquisa por nome
- [ ] pesquisa por CPF/CNPJ
- [ ] pesquisa por e-mail
- [ ] pesquisa por telefone
- [ ] pesquisa por representante
- [ ] filtros de ativos, inativos e todos
- [ ] edição
- [ ] detalhes
- [ ] inativação
- [ ] reativação
- [ ] persistência após reinício
- [ ] cliente inexistente
- [ ] falha de banco simulada ou controlada
- [ ] logout fecha banco e limpa sessão
- [ ] modo offline com usuário conhecido
- [ ] primeiro acesso offline rejeitado

## Empacotamento Futuro

- [ ] ícone definitivo
- [ ] `appId`
- [ ] nome do produto
- [ ] versão
- [ ] instalador Windows
- [ ] módulo nativo reconstruído
- [ ] migrations incluídas
- [ ] teste em máquina limpa
- [ ] assinatura digital avaliada

## Configuração

- [ ] `appId` definido como `com.clientdesk.app`
- [ ] `productName` definido como `ClientDesk`
- [ ] versão revisada
- [ ] ícone revisado
- [ ] `better-sqlite3` reconstruído
- [ ] migrations incluídas
- [ ] preload incluído
- [ ] banco não incluído
- [ ] `userData` validado

## Build

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run package:dir`
- [ ] `npm run verify:package`
- [ ] `npm run package:win`
- [ ] se estiver em macOS/Linux, confirmar build Windows em Windows ou CI Windows

## Validação Windows

- [ ] instalação concluída
- [ ] atalho criado
- [ ] aplicativo aberto
- [ ] banco criado
- [ ] cliente cadastrado
- [ ] persistência após reinício
- [ ] edição validada
- [ ] inativação validada
- [ ] desinstalação validada
- [ ] banco preservado após desinstalação
- [ ] reinstalação reconhece dados anteriores
- [ ] backup local criado
- [ ] restauração local validada
- [ ] arquivo inválido rejeitado
- [ ] sincronização manual com ambiente seguro validada
- [ ] pull remoto validado em ambiente com Auth/RLS
- [ ] resolução de conflito local validada
- [ ] resolução de conflito remoto validada
- [ ] fila pendente preservada offline
- [ ] duas instalações com a mesma conta convergem
- [ ] conflito real entre duas instalações resolvido
- [ ] Realtime conectado em canal privado do usuário
- [ ] evento Realtime dispara pull incremental
- [ ] polling recupera alteração quando Realtime está indisponível
- [ ] logout remove canal Realtime
- [ ] troca de usuário não reaproveita canal anterior
- [ ] histórico do cliente registra cadastro, edição, status, pull e conflito
- [ ] diagnóstico exibe estado de sync, Realtime, outbox, conflitos e últimos ciclos
- [ ] exportação de diagnóstico não contém clientes, tokens, chaves, banco ou paths internos

## Segurança

- [ ] `nodeIntegration` desabilitado
- [ ] `contextIsolation` habilitado
- [ ] preload mínimo
- [ ] banco fora do executável
- [ ] logs sem dados pessoais
- [ ] instalador sem credenciais
- [ ] `.env` não incluído no pacote
- [ ] nenhuma chave Supabase exposta ao renderer
- [ ] Supabase RLS/Auth revisados antes de habilitar sync
- [ ] policies restringem `customers.user_id = auth.uid()`
- [ ] RPC `sync_upsert_customer` testada sem `service_role`
- [ ] anon não acessa `customers`
- [ ] policy de `realtime.messages` restringe tópico por `auth.uid()`
- [ ] renderer não recebe tópico, payload, socket ou token Realtime
- [ ] backup de outro usuário rejeitado
- [ ] logs e diagnóstico não contêm CPF/CNPJ, e-mail completo, telefone, representante ou endereço
- [ ] auditoria registra somente nomes de campos alterados
- [ ] assinatura digital avaliada
- [ ] metadados de atualização gerados
- [ ] update não instala durante backup, restauração, sync, migration ou conflito
- [ ] atualização preserva banco, sessão, backups, outbox e cursor

## Assinatura

- [ ] instalador inicial identificado como não assinado
- [ ] aviso de editor desconhecido do Windows documentado
- [ ] certificado de assinatura planejado antes de distribuição pública
- [ ] nenhum certificado ou segredo commitado
- [ ] secrets `WINDOWS_CSC_LINK` e `WINDOWS_CSC_KEY_PASSWORD` configurados somente na CI quando houver certificado real
- [ ] assinatura validada com publisher esperado

## Atualização Automática

- [ ] `MAIN_VITE_UPDATE_ENABLED=false` no padrão distribuível até assinatura e provider serem validados
- [ ] `electron-updater` não é importado no renderer
- [ ] IPCs `update:*` retornam `IpcResult`
- [ ] renderer não recebe URL, token, provider, caminho do instalador ou stack trace
- [ ] canal stable validado
- [ ] canal beta validado para `0.9.0-rc.1`
- [ ] usuários stable não recebem `0.9.0-rc.1`
- [ ] downgrade automático bloqueado
- [ ] instalação exige confirmação do usuário
- [ ] migrations locais aplicadas com banco preservado após update

## Comandos de Validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run package:dir
npm run verify:package
npm run package:win
npm run release:check
```

Use `npm run package:win` para gerar o pacote Windows quando o ambiente estiver preparado.
