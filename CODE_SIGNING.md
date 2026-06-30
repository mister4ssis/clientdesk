# Code Signing

## Estratégia

A assinatura Windows está preparada para o `electron-builder`, mas nenhum certificado é armazenado no repositório.

Secrets esperados na CI:

- `WINDOWS_CSC_LINK`: certificado de assinatura em formato aceito pelo `electron-builder`;
- `WINDOWS_CSC_KEY_PASSWORD`: senha do certificado.

Não criar certificado fictício, PFX no repositório, senha em YAML ou certificado base64 hardcoded.

## Sem certificado

Quando os secrets não existirem, a pipeline gera build não assinado apenas para homologação. Esse artifact não deve ser tratado como pronto para distribuição pública.

Enquanto a assinatura e a origem de publicação não estiverem validadas, `MAIN_VITE_UPDATE_ENABLED=false` deve continuar sendo o padrão.

## Validação esperada

Antes de distribuição pública, validar em Windows:

- assinatura presente no executável e instalador;
- publisher esperado exibido pelo Windows;
- hash SHA-256 gerado após assinatura;
- instalador inicia sem alteração posterior do artifact;
- banco em `userData` preservado após atualização.
