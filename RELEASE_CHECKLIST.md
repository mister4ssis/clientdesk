# Release Checklist - ClientDesk

## Preparação

- [ ] lint aprovado
- [ ] typecheck aprovado
- [ ] testes aprovados
- [ ] build aprovado
- [ ] migrations validadas
- [ ] segurança revisada
- [ ] banco salvo em `userData`
- [ ] backup criado e validado
- [ ] restauração validada com backup automático
- [ ] persistência validada
- [ ] erros sanitizados
- [ ] logs revisados

## Testes Funcionais

- [ ] cadastro pessoa física
- [ ] cadastro pessoa jurídica
- [ ] CPF/CNPJ duplicado
- [ ] pesquisa por nome
- [ ] pesquisa por CPF/CNPJ
- [ ] pesquisa por e-mail
- [ ] pesquisa por telefone
- [ ] filtros de ativos, inativos e todos
- [ ] edição
- [ ] detalhes
- [ ] inativação
- [ ] reativação
- [ ] persistência após reinício
- [ ] cliente inexistente
- [ ] falha de banco simulada ou controlada

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

## Segurança

- [ ] `nodeIntegration` desabilitado
- [ ] `contextIsolation` habilitado
- [ ] preload mínimo
- [ ] banco fora do executável
- [ ] logs sem dados pessoais
- [ ] instalador sem credenciais
- [ ] assinatura digital avaliada

## Assinatura

- [ ] instalador inicial identificado como não assinado
- [ ] aviso de editor desconhecido do Windows documentado
- [ ] certificado de assinatura planejado antes de distribuição pública
- [ ] nenhum certificado ou segredo commitado

## Comandos de Validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run package:dir
```

Use `npm run package:win` para gerar o pacote Windows quando o ambiente estiver preparado.
