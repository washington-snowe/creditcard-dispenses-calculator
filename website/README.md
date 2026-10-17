# Site do ContaClara

Site público independente do Electron. Usa React, TypeScript e Vite, com cópias exatas dos arquivos oficiais de marca em `public/brand` e fontes Manrope/Inter incluídas no build. A pasta é autossuficiente e pode ser extraída ou copiada sem o projeto desktop.

[Baixar o site v0.2.0 — código e build em ZIP](https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/download/website-v0.2.0/ContaClara-Site-v0.2.0.zip)

Extraia o ZIP e abra a pasta `ContaClara-Site`. Ela inclui o código, a configuração Firebase, as instruções e `dist/` pronto para hospedagem estática. Para desenvolver, instale Node.js 22.12 ou superior e execute os comandos abaixo. O HTML compilado deve ser servido por HTTP, com `npm run preview` ou uma hospedagem; abrir `index.html` diretamente pelo explorador de arquivos não inicia o site.

## Executar

Na pasta `website/`:

```sh
npm ci
npm run dev
```

Abra `http://localhost:5174`. Para produção e validação:

```sh
npm run build
npm test
npm run preview
```

O preview fica em `http://localhost:4174`. `npm test` exige o build e Chromium (`CHROMIUM_PATH` ou `/usr/bin/chromium`). As capturas ficam em `website/.runtime/`. Não é necessário configurar Firebase para revisar o site.

## O que está pronto

A copy de conversão e o guia de espaçamento/centralização estão em [docs/copy-e-layout.md](docs/copy-e-layout.md). As alterações de layout têm comentários **ALTERAÇÃO** em `src/layout.css`, que concentra a escala de margens, grids, CTAs e adaptações responsivas. `src/styles.css` mantém a base, as ilustrações, a demonstração e os formulários; as regras antigas de layout correspondentes foram removidas.

- Landing page responsiva, navegação móvel, atalhos de download do ZIP Windows e FAQ.
- Demonstração com três abas e três meses usando somente dados fictícios; não acessa o armazenamento financeiro do desktop.
- Apresentação de recursos reais, períodos mensal/anual com preços **em definição**, conforme a decisão do proprietário.
- Área de conta com Firebase Authentication: e-mail/senha, Google, criação de conta, confirmação de e-mail, recuperação e saída. Sem configuração, mostra honestamente que a área ainda está em preparação.
- Leitura da própria assinatura via Firestore e cliente para duas funções de cobrança. **O backend de pagamento, o provedor e a licença no Electron ainda não foram implementados**, porque o provedor ficou para uma decisão posterior. Não há cobrança ativa.
- Suporte e versões iniciais de termos/privacidade, com indicação de revisão. Os textos comerciais finais dependem do responsável, contato, regras dos planos e provedor.

## Configurar Firebase

1. Crie ou selecione um projeto Firebase e registre um aplicativo **Web**.
2. Copie `.env.example` para `.env.local` e preencha os quatro identificadores `VITE_FIREBASE_*` fornecidos pelo Firebase. São dados públicos de configuração Web. **Não** coloque chave de conta de serviço, token administrativo ou segredo de pagamento em variáveis `VITE_*`.
3. Em Authentication, habilite E-mail/senha e Google. Configure o nome público e os modelos de e-mail; adicione o domínio do site e `localhost` à lista de domínios autorizados.
4. Crie Firestore e revise/publique `firestore.rules`. Clientes não podem criar ou alterar assinaturas. Nenhum registro financeiro é enviado a esse banco.
5. Defina `VITE_SUPPORT_EMAIL`, `VITE_SELLER_NAME` e `VITE_SELLER_DOCUMENT`. Revise os textos de termos e privacidade antes de abrir cadastros.
6. Recompile. Variáveis Vite são incorporadas no build; mudanças exigem novo build.

O login real depende de um projeto configurado. Os testes locais cobrem o estado sem credenciais, a interface pública e o fluxo de autenticação com respostas HTTP simuladas (senha incorreta, recuperação, consentimento, cadastro, confirmação, entrada, saída e persistência). Não criam contas ou transações em serviços externos. Google e entregas reais de e-mail devem ser validados com o projeto escolhido.

## Planos e integração futura de cobrança

O proprietário definiu **preços em definição** e **provedor a escolher depois**. Edite valores em centavos em `src/config.ts` quando houver uma oferta aprovada. Mensal e anual representam períodos do mesmo produto; não há promessa de desconto, limite de dispositivos ou recurso exclusivo ainda não definido.

O contrato do cliente está em [docs/billing-contract.md](docs/billing-contract.md). Ele prevê funções autenticadas `createCheckout` e `createPortal`, um documento privado `/billing/{uid}` e confirmação exclusivamente por webhook no servidor. `VITE_CHECKOUT_ENABLED` permanece `false` até essa implementação e seus testes. Ao ativar, configure também os preços, condições e política de cancelamento. Nunca use o navegador para gravar `status: active`.

Criar uma conta ou contratar no site **não libera nem bloqueia** o executável atual: a autenticação/licença no Electron é uma próxima implementação separada e deve preservar uso e dados existentes.

## Hospedar no Firebase

O projeto Firebase e o domínio são escolhas do proprietário. Nenhum site foi publicado automaticamente.

Com Firebase CLI disponível e autenticado, na pasta `website/`:

```sh
npm run build
firebase deploy --project SEU_PROJECT_ID --only firestore:rules,hosting
```

`firebase.json` define cache, fallback SPA e cabeçalhos. Ao usar domínio de autenticação personalizado, revise `frame-src`/`connect-src` da CSP para permitir exatamente esse domínio. Valide Google e e-mails de confirmação no domínio publicado. Os recursos em `assets/` são versionados por hash; HTML usa revalidação.

O site pode ser hospedado estaticamente em outros provedores usando `dist/`. Isso não exige alterar ou publicar uma versão desktop.

## Gerar e publicar o ZIP

`npm run package` compila e gera `downloads/ContaClara-Site-v0.2.0.zip`, com checksum SHA-256. O script usa `zip` e `unzip` (Linux/macOS ou ambiente equivalente). O pacote usa uma lista explícita de arquivos; dependências, `.env.local` e arquivos de testes temporários não entram nele.

O workflow `.github/workflows/website.yml` valida o site. Uma tag `website-v0.2.0`, correspondente à versão deste `package.json`, publica o ZIP após os testes. Essa release é separada das versões Windows e não altera a versão mais recente do aplicativo desktop. Publicar o ZIP no GitHub não hospeda o site na internet.

Ao atualizar a identidade visual, mantenha `public/brand` sincronizado com os PNG/ICO oficiais do aplicativo, sem modificar as imagens.
