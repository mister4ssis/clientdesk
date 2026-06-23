# Release Checklist - ClientDesk

## Preparação

- [ ] lint aprovado
- [ ] typecheck aprovado
- [ ] testes aprovados
- [ ] build aprovado
- [ ] migrations validadas
- [ ] segurança revisada
- [ ] banco salvo em `userData`
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

## Comandos de Validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run package:dir
```

Use `npm run package:win` para gerar o pacote Windows quando o ambiente estiver preparado.
